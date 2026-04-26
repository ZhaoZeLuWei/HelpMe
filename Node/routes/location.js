const express = require("express");
const { ObjectId } = require("mongodb");
const { getLocationDb } = require("../help_me_location_db.js");

const router = express.Router();
const COLLECTION_NAME = "places";

let initPromise = null;

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

// ================= 数据库初始化（只建索引，不读文件） =================

async function initPlacesCollection() {
  if (!initPromise) {
    initPromise = (async () => {
      const db = await getLocationDb();
      const places = db.collection(COLLECTION_NAME);

      // 只要库是空的，这些索引指令就是安全的
      await places.createIndex({ geo: "2dsphere" });
      await places.createIndex({ name: 1 });
      await places.createIndex({ tags: 1 });
      await places.createIndex({ isActive: 1, sortWeight: -1 });
    })();
  }

  return initPromise;
}

// ================= 数据格式化 =================

function mapPlace(place) {
  const coordinates = Array.isArray(place?.geo?.coordinates)
    ? place.geo.coordinates
    : [null, null];

  return {
    id: String(place._id),
    name: place.name,
    shortName: place.shortName || place.name,
    district: place.district || "",
    address: place.address || "",
    lng: coordinates[0],
    lat: coordinates[1],
    tags: Array.isArray(place.tags) ? place.tags : [],
    distanceMeters:
      typeof place.distanceMeters === "number"
        ? Math.round(place.distanceMeters)
        : null,
  };
}

function buildKeywordQuery(keyword) {
  const q = String(keyword || "").trim();
  if (!q) return { isActive: true };

  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  return {
    isActive: true,
    $or: [
      { name: regex },
      { shortName: regex },
      { district: regex },
      { address: regex },
      { tags: regex },
    ],
  };
}

// ================= 路由拦截器（自动初始化） =================

router.use(async (req, res, next) => {
  try {
    await initPlacesCollection();
    next();
  } catch (err) {
    console.error("位置库初始化失败:", err);
    res.status(500).json({ success: false, error: "位置服务初始化失败" });
  }
});

// ================= 接口 =================

// 搜索建议
router.get("/locations/suggest", async (req, res) => {
  const db = await getLocationDb();
  const places = db.collection(COLLECTION_NAME);

  const keyword = String(req.query.q || "").trim();
  const limitRaw = Number(req.query.limit);
  const limit = Number.isInteger(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), 30)
    : 20;

  const lng = toNumber(req.query.lng);
  const lat = toNumber(req.query.lat);
  const hasCenter = lng !== null && lat !== null;

  const query = buildKeywordQuery(keyword);

  try {
    let rows = [];

    if (hasCenter) {
      rows = await places
        .aggregate([
          {
            $geoNear: {
              near: { type: "Point", coordinates: [lng, lat] },
              distanceField: "distanceMeters",
              spherical: true,
              query,
            },
          },
          { $sort: { sortWeight: -1, distanceMeters: 1 } },
          { $limit: limit },
        ])
        .toArray();
    } else {
      rows = await places
        .find(query)
        .sort({ sortWeight: -1, _id: 1 })
        .limit(limit)
        .toArray();
    }

    return res.json({
      success: true,
      locations: rows.map(mapPlace),
    });
  } catch (err) {
    console.error("查询地点建议失败:", err);
    return res.status(500).json({ success: false, error: "查询地点建议失败" });
  }
});

// 附近地点
router.get("/locations/nearby", async (req, res) => {
  const db = await getLocationDb();
  const places = db.collection(COLLECTION_NAME);

  const lng = toNumber(req.query.lng);
  const lat = toNumber(req.query.lat);
  if (lng === null || lat === null) {
    return res.status(400).json({ success: false, error: "请提供有效经纬度" });
  }

  const radiusRaw = Number(req.query.radius);
  const radius = Number.isFinite(radiusRaw)
    ? Math.min(Math.max(radiusRaw, 100), 5000)
    : 1500;

  const limitRaw = Number(req.query.limit);
  const limit = Number.isInteger(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), 30)
    : 20;

  try {
    const rows = await places
      .aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [lng, lat] },
            distanceField: "distanceMeters",
            maxDistance: radius,
            spherical: true,
            query: { isActive: true },
          },
        },
        { $sort: { distanceMeters: 1, sortWeight: -1 } },
        { $limit: limit },
      ])
      .toArray();

    return res.json({ success: true, locations: rows.map(mapPlace) });
  } catch (err) {
    console.error("查询附近地点失败:", err);
    return res.status(500).json({ success: false, error: "查询附近地点失败" });
  }
});

// 地点详情
router.get("/locations/:id", async (req, res) => {
  const db = await getLocationDb();
  const places = db.collection(COLLECTION_NAME);

  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, error: "无效地点ID" });
  }

  try {
    const row = await places.findOne({ _id: new ObjectId(id), isActive: true });
    if (!row) {
      return res.status(404).json({ success: false, error: "地点不存在" });
    }

    return res.json({ success: true, location: mapPlace(row) });
  } catch (err) {
    console.error("查询地点详情失败:", err);
    return res.status(500).json({ success: false, error: "查询地点详情失败" });
  }
});
// 保存地点（从高德地图获取后存入数据库）
router.post("/locations/save", async (req, res) => {
  const db = await getLocationDb();
  const places = db.collection(COLLECTION_NAME);

  const { locations } = req.body;
  if (!Array.isArray(locations) || locations.length === 0) {
    return res.status(400).json({ success: false, error: "无效的地点数据" });
  }

  try {
    const now = new Date();
    const docs = locations.map((loc) => ({
      name: loc.name,
      shortName: loc.name,
      district: loc.district || "",
      address: loc.address || loc.name,
      lng: Number(loc.lng) || 0,
      lat: Number(loc.lat) || 0,
      tags: [],
      sortWeight: 0,
      geo: {
        type: "Point",
        coordinates: [Number(loc.lng) || 0, Number(loc.lat) || 0],
      },
      isActive: true,
      source: "amap",  // 标记数据来源
      createdAt: now,
      updatedAt: now,
    }));

    // 批量插入或更新（如果已存在则更新）
    const bulkOps = docs.map((doc) => ({
      updateOne: {
        filter: { name: doc.name, address: doc.address },
        update: { $set: doc },
        upsert: true,
      },
    }));

    await places.bulkWrite(bulkOps);

    return res.json({ success: true, count: docs.length });
  } catch (err) {
    console.error("保存地点失败:", err);
    return res.status(500).json({ success: false, error: "保存地点失败" });
  }
});

// 管理端列表
router.get("/admin/locations", async (req, res) => {
  const db = await getLocationDb();
  const places = db.collection(COLLECTION_NAME);

  const includeInactive = String(req.query.includeInactive || "0") === "1";
  const where = includeInactive ? {} : { isActive: true };

  try {
    const rows = await places
      .find(where)
      .sort({ sortWeight: -1, _id: 1 })
      .limit(500)
      .toArray();

    return res.json({ success: true, locations: rows.map(mapPlace) });
  } catch (err) {
    console.error("查询管理端地点列表失败:", err);
    return res.status(500).json({ success: false, error: "查询地点失败" });
  }
});
router.get("/test", (req, res) => {
  res.json({ message: "location routes working" });
});
module.exports = router;