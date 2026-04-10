const express = require("express");
const { ObjectId } = require("mongodb");
const fs = require("node:fs/promises");
const path = require("node:path");
const { getLocationDb } = require("../help_me_location_db.js");

const router = express.Router();
const COLLECTION_NAME = "places";

const SEED_FILE_PATH = path.join(__dirname, "..", "sql", "location.seed.json");

let initPromise = null;

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .slice(0, 10);
  }

  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 10);
  }

  return [];
}

function buildSeedDocument(place) {
  const lng = toNumber(place?.lng);
  const lat = toNumber(place?.lat);
  if (lng === null || lat === null) {
    return null;
  }

  const name = String(place?.name || "").trim();
  if (!name) {
    return null;
  }

  return {
    name,
    shortName: String(place?.shortName || name).trim(),
    district: String(place?.district || "").trim(),
    address: String(place?.address || "").trim(),
    lng,
    lat,
    tags: normalizeTags(place?.tags),
    sortWeight: Number.isFinite(Number(place?.sortWeight))
      ? Number(place.sortWeight)
      : 0,
    geo: {
      type: "Point",
      coordinates: [lng, lat],
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

async function loadSeedFromFile() {
  const content = await fs.readFile(SEED_FILE_PATH, "utf8");
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.map(buildSeedDocument).filter(Boolean);
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

async function initPlacesCollection() {
  if (!initPromise) {
    initPromise = (async () => {
      const db = await getLocationDb();
      const places = db.collection(COLLECTION_NAME);

      await places.createIndex({ geo: "2dsphere" });
      await places.createIndex({ name: 1 });
      await places.createIndex({ tags: 1 });
      await places.createIndex({ isActive: 1, sortWeight: -1 });

      const count = await places.countDocuments({});
      if (count === 0) {
        const seed = await loadSeedFromFile();
        if (seed.length > 0) {
          await places.insertMany(seed);
        }
      }
    })();
  }

  return initPromise;
}

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

router.use(async (req, res, next) => {
  try {
    await initPlacesCollection();
    next();
  } catch (err) {
    console.error("位置库初始化失败:", err);
    res.status(500).json({ success: false, error: "位置服务初始化失败" });
  }
});

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


module.exports = router;
