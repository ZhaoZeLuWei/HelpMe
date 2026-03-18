CREATE DATABASE IF NOT EXISTS help_me_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE help_me_db;


SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS Comments;
DROP TABLE IF EXISTS Orders;
DROP TABLE IF EXISTS Verifications;
DROP TABLE IF EXISTS Events;
DROP TABLE IF EXISTS Providers;
DROP TABLE IF EXISTS Consumers;
DROP TABLE IF EXISTS Users;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE Users (
  UserId        INT(10) AUTO_INCREMENT PRIMARY KEY,
  UserName      VARCHAR(255) NOT NULL,
  PhoneNumber   VARCHAR(11)  NOT NULL,
  RealName      VARCHAR(255) NOT NULL,
  IdCardNumber  VARCHAR(18)  NOT NULL,
  UserAvatar    VARCHAR(255) NOT NULL,
  Location      VARCHAR(255) NOT NULL,
  BirthDate     DATE         NOT NULL,
  Introduction  VARCHAR(255) NULL,
  CreateTime    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_users_phone (PhoneNumber),
  UNIQUE KEY uk_users_idcard (IdCardNumber)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Consumers (
  ConsumerId   INT(10) PRIMARY KEY,
  BuyerRanking DECIMAL(2,1) NOT NULL DEFAULT 0.0,

  CONSTRAINT fk_consumers_user
    FOREIGN KEY (ConsumerId) REFERENCES Users(UserId)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Providers (
  ProviderId     INT(10) PRIMARY KEY,
  ProviderRole   TINYINT(1)   NOT NULL DEFAULT 1,
  OrderCount     INT(4)       NOT NULL DEFAULT 0,
  ServiceRanking DECIMAL(2,1) NOT NULL DEFAULT 0.0,

  CONSTRAINT fk_providers_user
    FOREIGN KEY (ProviderId) REFERENCES Users(UserId)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Events (
  EventId        INT(10) AUTO_INCREMENT PRIMARY KEY,
  CreatorId      INT(10)        NOT NULL,
  EventTitle     VARCHAR(255)   NOT NULL,
  EventType      TINYINT(1)     NOT NULL,
  EventCategory  VARCHAR(255)   NOT NULL,
  Photos         TEXT           NULL,
  Location       VARCHAR(100)   NOT NULL,
  Price          DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  EventDetails   VARCHAR(255)   NOT NULL,
  CreateTime     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_events_creator (CreatorId),
  CONSTRAINT fk_events_creator
    FOREIGN KEY (CreatorId) REFERENCES Users(UserId)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Verifications (
  VerificationId     INT(10) AUTO_INCREMENT PRIMARY KEY,
  ProviderId         INT(10)      NOT NULL,
  ServiceCategory    TINYINT(1)   NOT NULL,
  VerificationStatus TINYINT(1)   NOT NULL DEFAULT 0,
  IdCardPhoto        VARCHAR(255) NOT NULL,
  ProfessionPhoto    VARCHAR(255) NULL,
  SubmissionTime     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PassingTime        TIMESTAMP    NULL,
  Results            VARCHAR(255) NULL,

  KEY idx_verifications_provider (ProviderId),
  CONSTRAINT fk_verifications_provider
    FOREIGN KEY (ProviderId) REFERENCES Providers(ProviderId)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Orders (
  OrderId            INT(10) AUTO_INCREMENT PRIMARY KEY,
  EventId            INT(10)        NOT NULL,
  ProviderId         INT(10)        NOT NULL,
  ConsumerId         INT(10)        NOT NULL,
  OrderStatus        TINYINT(1)     NOT NULL DEFAULT 0,
  TransactionPrice   DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  DetailLocation     VARCHAR(255)   NOT NULL,
  OrderCreateTime    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PaymentTime        TIMESTAMP      NULL,
  VerificationCode   VARCHAR(255)   NOT NULL,
  VerificationResult TINYINT(1)     NOT NULL,
  ServiceTime        TIMESTAMP      NULL,
  CompletionTime     TIMESTAMP      NULL,
  RefundTime         TIMESTAMP      NULL,

  KEY idx_orders_event (EventId),
  KEY idx_orders_consumer (ConsumerId),

  CONSTRAINT fk_orders_event
    FOREIGN KEY (EventId) REFERENCES Events(EventId)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT fk_orders_provider
    FOREIGN KEY (ProviderId) REFERENCES Providers(ProviderId)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT fk_orders_consumer
    FOREIGN KEY (ConsumerId) REFERENCES Consumers(ConsumerId)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Comments (
  ReviewId      INT(10) AUTO_INCREMENT PRIMARY KEY,
  OrderId       INT(10)       NOT NULL,
  AuthorId      INT(10)       NOT NULL,
  TargetUserId  INT(10)       NOT NULL,
  Time          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Score         DECIMAL(2,1)  NOT NULL DEFAULT 0.0,
  Text          VARCHAR(255)  NULL,

  KEY idx_comments_order (OrderId),
  KEY idx_comments_author (AuthorId),
  KEY idx_comments_target (TargetUserId),

  CONSTRAINT fk_comments_order
    FOREIGN KEY (OrderId) REFERENCES Orders(OrderId)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_comments_author
    FOREIGN KEY (AuthorId) REFERENCES Users(UserId)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT fk_comments_target
    FOREIGN KEY (TargetUserId) REFERENCES Users(UserId)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



-- =========================
-- 测试用案例数据（中文）- ID 统一规则（全部6位）
-- Users:         100XXX
-- Orders:        200XXX
-- Events:        300XXX
-- Verifications: 400XXX
-- Comments:      500XXX
-- =========================
SET NAMES utf8mb4;

-- 1) Users（用户）
INSERT INTO Users
(UserId, UserName, PhoneNumber, RealName, IdCardNumber, UserAvatar, Location, BirthDate, Introduction)
VALUES
(100001, '雨墨', '13800000001', '张小雨', '450123199801012341', '/img/u1.png', '广西·柳州', '1998-01-01', '爱折腾，接单也下单。'),
(100002, '阿伟', '13800000002', '李伟',   '450123199707152342', '/img/u1.png', '广东·深圳', '1997-07-15', '专注上门维修/装机。'),
(100003, '芳芳', '13800000003', '王芳',   '450123200002202343', '/img/u1.png', '广西·南宁', '2000-02-20', '只想当买家，找靠谱师傅。'),
(100004, '浩子', '13800000004', '陈浩',   '450123199912122344', '/img/u1.png', '上海·浦东', '1999-12-12', '会摄影也会跑腿。'),
(100005, '赵敏', '13800000005', '赵敏',   '450123200103082345', '/img/u1.png', '北京·海淀', '2001-03-08', '周末需要家政/搬运帮忙。'),
(100006, '老周', '13800000006', '周强',   '450123199605062346', '/img/u1.png', '四川·成都', '1996-05-06', '家电清洗、深度清洁都可。'),
(100007, '小孙', '13800000007', '孙丽',   '450123200211112347', '/img/u1.png', '浙江·杭州', '2002-11-11', '学生党，偶尔下单。'),
(100008, '刘洋', '13800000008', '刘洋',   '450123199910102348', '/img/u1.png', '重庆·渝中', '1999-10-10', '可提供设计/修图服务，也会下单。');

-- 2) Consumers（消费者）
-- 说明：100001、100004、100008 同时也会是 Providers（双身份）
INSERT INTO Consumers (ConsumerId, BuyerRanking) VALUES
(100001, 4.6),
(100003, 4.2),
(100004, 4.8),
(100005, 4.0),
(100007, 3.9),
(100008, 4.4);

-- 3) Providers（服务者）
INSERT INTO Providers (ProviderId, ProviderRole, OrderCount, ServiceRanking) VALUES
(100001, 1, 12, 4.7),
(100002, 1, 35, 4.9),
(100004, 1, 18, 4.6),
(100006, 1, 40, 4.8),
(100008, 1,  9, 4.5);

-- 4) Events（服务/活动发布）
INSERT INTO Events
(EventId, CreatorId, EventTitle, EventType, EventCategory, Photos, Location, Price, EventDetails, CreateTime)
VALUES
(300001, 100002, '上门电脑重装系统', 1, '电脑维修', '["/img/e1_1.png"]', '深圳·南山',  99.00, '含基础驱动安装，复杂问题另议。', DATE_SUB(NOW(), INTERVAL 20 DAY)),
(300002, 100006, '家电深度清洗（空调/洗衣机）', 1, '家政清洁', '["/img/e1_1.png"]',             '成都·武侯', 129.00, '上门服务，按台计费。',       DATE_SUB(NOW(), INTERVAL 15 DAY)),
(300003, 100004, '人像摄影约拍（1小时）', 1, '摄影摄像', NULL,                             '上海·浦东', 199.00, '送精修5张，底片全给。',       DATE_SUB(NOW(), INTERVAL 10 DAY)),
(300004, 100008, '海报设计/修图（单张）', 1, '设计修图', '["/img/e1_1.png"]',             '线上服务',   59.00, '48小时交付，可沟通修改。',     DATE_SUB(NOW(), INTERVAL 8 DAY)),
(300005, 100001, '同城跑腿代取代送',     0, '跑腿代办', NULL,                             '柳州·城中',  20.00, '起步价20，超出距离另算。',     DATE_SUB(NOW(), INTERVAL 6 DAY));

-- 5) Verifications（服务者认证）- 统一 400XXX
-- VerificationStatus：0待审 / 1通过 / 2驳回（仅测试用）
INSERT INTO Verifications
(VerificationId, ProviderId, ServiceCategory, VerificationStatus, IdCardPhoto, ProfessionPhoto, SubmissionTime, PassingTime, Results)
VALUES
(400001, 100002, 1, 1, '/img/id_1.png', '/img/pro_1.png', DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_SUB(NOW(), INTERVAL 29 DAY), '资料齐全，审核通过'),
(400002, 100006, 2, 1, '/img/id_1.png', '/img/pro_1.png', DATE_SUB(NOW(), INTERVAL 25 DAY), DATE_SUB(NOW(), INTERVAL 24 DAY), '认证通过'),
(400003, 100004, 3, 0, '/img/id_1.png', NULL,            DATE_SUB(NOW(), INTERVAL 12 DAY), NULL,                             '等待审核'),
(400004, 100008, 3, 2, '/img/id_1.png', '/img/pro_1.png', DATE_SUB(NOW(), INTERVAL 18 DAY), DATE_SUB(NOW(), INTERVAL 17 DAY), '职业证明不清晰，请补充');

-- 6) Orders（订单）- 统一 200XXX
-- 注意：每条订单 ProviderId != ConsumerId（避免同单出现双身份）
INSERT INTO Orders
(OrderId, EventId, ProviderId, ConsumerId, OrderStatus, TransactionPrice, DetailLocation, OrderCreateTime, PaymentTime,
 VerificationCode, VerificationResult, ServiceTime, CompletionTime, RefundTime)
VALUES
(200001, 300001, 100002, 100003, 2,  99.00, '深圳·南山科技园A座', DATE_SUB(NOW(), INTERVAL 9 DAY),  DATE_SUB(NOW(), INTERVAL 9 DAY),
 'SZ20251222001', 1, DATE_SUB(NOW(), INTERVAL 8 DAY),  DATE_SUB(NOW(), INTERVAL 8 DAY),  NULL),

(200002, 300002, 100006, 100005, 2, 129.00, '成都·武侯红牌楼小区', DATE_SUB(NOW(), INTERVAL 7 DAY),  DATE_SUB(NOW(), INTERVAL 7 DAY),
 'CD20251224002', 1, DATE_SUB(NOW(), INTERVAL 6 DAY),  DATE_SUB(NOW(), INTERVAL 6 DAY),  NULL),

(200003, 300003, 100004, 100007, 1, 199.00, '上海·世纪公园门口',   DATE_SUB(NOW(), INTERVAL 3 DAY),  DATE_SUB(NOW(), INTERVAL 3 DAY),
 'SH20251228003', 0, DATE_ADD(NOW(), INTERVAL 1 DAY),  NULL, NULL),

(200004, 300004, 100008, 100001, 0,  59.00, '线上交付（微信/邮箱）', DATE_SUB(NOW(), INTERVAL 2 DAY),  NULL,
 'ON20251229004', 0, NULL, NULL, NULL),

(200005, 300005, 100001, 100005, 3,  20.00, '柳州·城中万达1号门',  DATE_SUB(NOW(), INTERVAL 5 DAY),  DATE_SUB(NOW(), INTERVAL 5 DAY),
 'LZ20251226005', 0, NULL, NULL, DATE_SUB(NOW(), INTERVAL 4 DAY)),

(200006, 300001, 100002, 100008, 2,  99.00, '深圳·南山后海地铁口', DATE_SUB(NOW(), INTERVAL 14 DAY), DATE_SUB(NOW(), INTERVAL 14 DAY),
 'SZ20251217006', 1, DATE_SUB(NOW(), INTERVAL 13 DAY), DATE_SUB(NOW(), INTERVAL 13 DAY), NULL);

-- 7) Comments（评价）- 统一 500XXX
INSERT INTO Comments
(ReviewId, OrderId, AuthorId, TargetUserId, Time, Score, Text)
VALUES
(500001, 200001, 100003, 100002, DATE_SUB(NOW(), INTERVAL 8 DAY),  4.8, '师傅很准时，系统装得很干净，速度快。'),
(500002, 200002, 100005, 100006, DATE_SUB(NOW(), INTERVAL 6 DAY),  4.7, '清洗很细致，空调味道明显变小了。'),
(500003, 200006, 100008, 100002, DATE_SUB(NOW(), INTERVAL 13 DAY), 4.9, '沟通顺畅，问题定位很快，推荐！');
