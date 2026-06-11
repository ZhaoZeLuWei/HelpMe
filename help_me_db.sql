CREATE DATABASE IF NOT EXISTS help_me_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE help_me_db;


SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS Favorites;
DROP TABLE IF EXISTS Follows;
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
  LocationPlaceId VARCHAR(24) NULL,
  BirthDate     DATE         NOT NULL,
  Introduction   VARCHAR(255) NULL,
  FollowerCount  INT(6)       NOT NULL DEFAULT 0 COMMENT '粉丝数',
  IsBanned       TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '是否被封禁 0=正常 1=封禁',
  BannedAt       DATETIME     DEFAULT NULL COMMENT '封禁时间',
  CreateTime     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
  LocationPlaceId VARCHAR(24)   NULL,
  LocationLng    DECIMAL(10,7)  NULL,
  LocationLat    DECIMAL(10,7)  NULL,
  Price          DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  EventDetails   TEXT           NOT NULL,
  FavoriteCount  INT(6)         NOT NULL DEFAULT 0 COMMENT '被收藏次数',
  Status         TINYINT(1)     NOT NULL DEFAULT 0 COMMENT '0=上架中, 1=已解决/已下架',
  CreateTime     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_events_creator (CreatorId),
  KEY idx_events_location_place (LocationPlaceId),
  CONSTRAINT fk_events_creator
    FOREIGN KEY (CreatorId) REFERENCES Users(UserId)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================
-- 事件标签表（AI 辅助功能）
-- =========================
CREATE TABLE IF NOT EXISTS EventTags (
  EventTagId  INT(10) AUTO_INCREMENT PRIMARY KEY,
  EventId     INT(10)      NOT NULL,
  Tag         VARCHAR(50)  NOT NULL,
  KEY idx_eventtags_event (EventId),
  KEY idx_eventtags_tag (Tag),
  CONSTRAINT fk_eventtags_event FOREIGN KEY (EventId) REFERENCES Events(EventId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Verifications (
  VerificationId       INT(10) AUTO_INCREMENT PRIMARY KEY,
  ProviderId           INT(10)      NOT NULL,
  ServiceCategory      TINYINT(1)   NOT NULL,
  OriginalProviderRole TINYINT(1)   NOT NULL DEFAULT 0,
  VerificationStatus   TINYINT(1)   NOT NULL DEFAULT 0,
  IdCardPhoto          VARCHAR(255) NOT NULL,
  ProfessionPhoto      VARCHAR(255) NULL,
  SubmissionTime       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PassingTime          TIMESTAMP    NULL,
  Results              VARCHAR(255) NULL,

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
  ServiceTime        TIMESTAMP      NULL,
  CompletionTime     TIMESTAMP      NULL,
  RefundTime         TIMESTAMP      NULL,
  CancelledBy        INT(10)        NULL,
  EventSnapshot      JSON           NULL,

  KEY idx_orders_event (EventId),
  KEY idx_orders_consumer (ConsumerId),

  CONSTRAINT fk_orders_event
    FOREIGN KEY (EventId) REFERENCES Events(EventId)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT fk_orders_provider
    FOREIGN KEY (ProviderId) REFERENCES Providers(ProviderId)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT fk_orders_consumer
    FOREIGN KEY (ConsumerId) REFERENCES Users(UserId)
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

CREATE TABLE Favorites (
  FavoriteId  INT(10) AUTO_INCREMENT PRIMARY KEY,
  UserId      INT(10)     NOT NULL,
  EventId     INT(10)     NOT NULL,
  CreateTime  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_favorites_user_event (UserId, EventId),
  KEY idx_favorites_user (UserId),
  KEY idx_favorites_event (EventId),

  CONSTRAINT fk_favorites_user
    FOREIGN KEY (UserId) REFERENCES Users(UserId)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_favorites_event
    FOREIGN KEY (EventId) REFERENCES Events(EventId)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Follows (
  FollowId    INT(10) AUTO_INCREMENT PRIMARY KEY,
  FollowerId  INT(10)     NOT NULL,
  FollowingId INT(10)     NOT NULL,
  CreateTime  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_follows_pair (FollowerId, FollowingId),
  KEY idx_follows_follower (FollowerId),
  KEY idx_follows_following (FollowingId),

  CONSTRAINT fk_follows_follower
    FOREIGN KEY (FollowerId) REFERENCES Users(UserId)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_follows_following
    FOREIGN KEY (FollowingId) REFERENCES Users(UserId)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
