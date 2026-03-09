// 此文件为图片上传的中间件模块

const fs = require("node:fs");
const path = require("node:path");
const { join } = require("node:path");
const multer = require("multer");

// 上传目录 + 文件格式（名称 + 格式限制）
const uploadDir = join(__dirname, "..", "..", "upload", "img");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = ext && ext.length <= 10 ? ext : "";
    const name = `${Date.now()}-${Math.random().toString(16).slice(2)}${safeExt}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("只允许上传图片文件，请检查后重试"));
  },
});

// 处理 multer 文件对象的统一格式
function flattenMulterFiles(files) {
  if (!files) return [];
  if (Array.isArray(files)) return files;
  const all = [];
  for (const k of Object.keys(files)) {
    const arr = files[k];
    if (Array.isArray(arr)) all.push(...arr);
  }
  return all;
}

// 表单上传失败后删除文件
function safeUnlink(p) {
  try {
    fs.unlinkSync(p);
  } catch (_) {}
}

function cleanupUploadedFiles(files) {
  const all = flattenMulterFiles(files);
  for (const f of all) {
    if (f && f.path) safeUnlink(f.path);
  }
}

function withMulter(mw) {
  return (req, res, next) => {
    mw(req, res, (err) => {
      if (err) {
        cleanupUploadedFiles(req.files);
        return res
          .status(400)
          .json({ success: false, error: err.message || "upload failed" });
      }
      return next();
    });
  };
}

module.exports = {
  uploadDir,
  upload,
  withMulter,
  cleanupUploadedFiles,
};
