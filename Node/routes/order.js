//下单，获取订单列表，更新订单状态，订单详情
const express = require("express");

const router = express.Router();
//下单
    await conn.commit();

    await Message.create({
      roomId: `system_${buyerId}`, 
      text: `您的订单：“${eventTitle}”创建成功，请等待服务商确认。`, 
      senderId: buyerId,
      userName: "系统通知",
      sendTime: new Date(),
    }).catch(err => console.error("写入下单通知失败:", err));

    return res.json({ success: true });

//接单
    await conn.commit();

    
    // 通知需求者
    await Message.create({
      roomId: `system_${buyerId}`,
      text: `您的订单：“${eventTitle}”已被服务商 ${providerName} 接单，请保持联系。`, 
      senderId: buyerId,
      userName: "系统通知",
      sendTime: new Date(),
    }).catch(err => console.error("写入接单通知失败(用户):", err));

    //通知服务商 
    await Message.create({
      roomId: `system_${providerId}`, 
      text: `您已成功接下订单：“${eventTitle}”。`, 
      senderId: providerId,
      userName: "系统通知",
      sendTime: new Date(),
    }).catch(err => console.error("写入接单通知失败(服务商):", err));

    return res.json({ success: true });


//订单完成
    await conn.commit();

    // --- 通知需求者 ---
    await Message.create({
      roomId: `system_${buyerId}`,
      text: `您的订单：“${eventTitle}”已完成，请及时对服务商进行评价。`, 
      senderId: buyerId,
      userName: "系统通知",
      sendTime: new Date(),
    }).catch(err => console.error("写入完成通知失败(用户):", err));

    // --- 通知服务商 ---
    await Message.create({
      roomId: `system_${providerId}`,
      text: `订单：“${eventTitle}”已完成，请及时对需求者进行评价。`, 
      senderId: providerId,
      userName: "系统通知",
      sendTime: new Date(),
    }).catch(err => console.error("写入完成通知失败(服务商):", err));

    return res.json({ success: true });

//订单取消
    await conn.commit();

    await Message.create({
      roomId: `system_${buyerId}`, // 通知需求者
      text: `您的订单：“${eventTitle}”已被取消。`, 
      senderId: buyerId,
      userName: "系统通知",
      sendTime: new Date(),
    }).catch(err => console.error("写入取消通知失败:", err));

    return res.json({ success: true });

//订单更新
    await conn.commit();

    await Message.create({
      roomId: `system_${buyerId}`, 
      text: `您的订单：“${eventTitle}”信息已被服务商修改，请查看。`, 
      senderId: buyerId,
      userName: "系统通知",
      sendTime: new Date(),
    }).catch(err => console.error("写入修改通知失败:", err));

    return res.json({ success: true });
module.exports = router;
