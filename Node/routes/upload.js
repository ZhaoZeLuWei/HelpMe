// 此文件为图片上传的中间件模块

const fs = require("node:fs");
const path = require("node:path");
const { join } = require("node:path");
const multer = require("multer");

// 普通图片上传目录（公开访问）
const uploadDir = join(__dirname, "..", "..", "upload", "img");
fs.mkdirSync(uploadDir, { recursive: true });

// 敏感文件上传目录（身份证、证书等，不公开访问）
const sensitiveDir = join(__dirname, "..", "..", "upload", "sensitive");
fs.mkdirSync(sensitiveDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = ext && ext.length <= 10 ? ext : "";
    const name = `${Date.now()}-${Math.random().toString(16).slice(2)}${safeExt}`;
    cb(null, name);
  },
});

// 文件头魔数校验（验证真实文件类型）
const IMAGE_SIGNATURES = {
  // PNG: 89 50 4E 47
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  // JPEG: FF D8 FF
  jpeg: Buffer.from([0xff, 0xd8, 0xff]),
  // GIF: 47 49 46 38
  gif: Buffer.from([0x47, 0x49, 0x46, 0x38]),
  // WebP: 52 49 46 46 ... 57 45 42 50
  webp: Buffer.from([0x52, 0x49, 0x46, 0x46]),
};

function validateImageMagicNumber(buffer) {
  if (!buffer || buffer.length < 4) return false;

  for (const [type, signature] of Object.entries(IMAGE_SIGNATURES)) {
    if (buffer.subarray(0, signature.length).equals(signature)) {
      return true;
    }
  }

  return false;
}

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    // 这里只做不会消费上传流的轻量校验，避免影响后续 storage 正常写盘
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new Error("只允许上传图片文件，请检查后重试"));
    }

    cb(null, true);
  },
});

// 敏感文件上传配置（身份证、证书等）
const sensitiveStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, sensitiveDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = ext && ext.length <= 10 ? ext : "";
    const name = `${Date.now()}-${Math.random().toString(16).slice(2)}${safeExt}`;
    cb(null, name);
  },
});

const sensitiveUpload = multer({
  storage: sensitiveStorage,
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

function collectUploadedFiles(req) {
  const all = flattenMulterFiles(req.files);
  if (req.file) all.push(req.file);
  return all;
}

/** multer 写盘成功后校验文件头魔数，伪造 mimetype 的文件会被删除并拒绝 */
function validateUploadedImages(req, res, next) {
  const files = collectUploadedFiles(req);
  if (files.length === 0) return next();

  for (const f of files) {
    if (!f?.path) continue;
    try {
      const fd = fs.openSync(f.path, "r");
      const header = Buffer.alloc(12);
      fs.readSync(fd, header, 0, 12, 0);
      fs.closeSync(fd);
      if (!validateImageMagicNumber(header)) {
        cleanupUploadedFiles(req.files);
        if (req.file?.path) safeUnlink(req.file.path);
        return res.status(400).json({
          success: false,
          error: "文件内容与图片格式不符，请上传有效的图片文件",
        });
      }
    } catch {
      cleanupUploadedFiles(req.files);
      if (req.file?.path) safeUnlink(req.file.path);
      return res.status(400).json({
        success: false,
        error: "无法读取上传文件，请重试",
      });
    }
  }
  return next();
}

function withMulter(mw) {
  return (req, res, next) => {
    mw(req, res, (err) => {
      if (err) {
        cleanupUploadedFiles(req.files);
        if (req.file?.path) safeUnlink(req.file.path);
        return res
          .status(400)
          .json({ success: false, error: err.message || "upload failed" });
      }
      return validateUploadedImages(req, res, next);
    });
  };
}

module.exports = {
  uploadDir,
  sensitiveDir,
  upload,
  sensitiveUpload,
  withMulter,
  cleanupUploadedFiles,
  validateUploadedImages,
  validateImageMagicNumber,
};
