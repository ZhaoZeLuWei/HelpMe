# User Stories

根据 Git 提交记录，为每位团队成员生成对应的 User Story。

> User Story 格式：**作为** [角色]，**我想要** [功能/行为]，**以便** [目的/价值]
> Format: **As a** [role], **I want to** [feature/action], **so that** [benefit/purpose]

---

## Zewei Xia（夏泽苇）

**主要负责方向：** 聊天系统后端、Socket.io 实时通信、管理员面板、通知推送、项目架构

| # | User Story | 对应 Commit |
|---|-----------|------------|
| 1 | **作为**用户，**我想要**通过 App 实时发送和接收聊天消息，**以便**与他人顺畅沟通。<br>*As a user, I want to send and receive chat messages in real time, so that I can communicate smoothly with others.* | `Chat Pages and Node for chat`, `room function socket.io` |
| 2 | **作为**用户，**我想要**系统根据活动事件自动创建对应的聊天室，**以便**参与者无需手动创建即可开始沟通。<br>*As a user, I want the system to automatically create a chat room based on an activity event, so that participants can start chatting without manual setup.* | `根据事件创建聊天室` |
| 3 | **作为**用户，**我想要**进入聊天室后可以读取所有历史消息，**以便**了解之前的对话内容。<br>*As a user, I want to read all historical messages when I enter a chat room, so that I can catch up on previous conversations.* | `Read all msg from MongoDB`, `读取聊天列表` |
| 4 | **作为**用户，**我想要**发送的消息被持久化存储到 MongoDB，**以便**消息不会丢失且可随时查看。<br>*As a user, I want my sent messages to be persisted in MongoDB, so that they are not lost and can be viewed at any time.* | `Write Msg into MongoDB` |
| 5 | **作为**已登录用户，**我想要**在聊天功能中通过 JWT 验证我的身份，**以便**只有授权用户才能使用聊天。<br>*As a logged-in user, I want to be authenticated via JWT when using the chat feature, so that only authorized users can chat.* | `User can chat using JWT`, `Login check`, `Quit login check` |
| 6 | **作为**未登录用户，**我想要**在未登录状态下访问聊天页面时被自动跳转到登录页，**以便**保护聊天功能的访问安全。<br>*As a guest user, I want to be redirected to the login page when accessing the chat page without logging in, so that the chat feature is protected.* | `优化聊天页面未登陆跳转` |
| 7 | **作为**用户，**我想要**发送通知消息，**以便**即时告知其他用户相关信息。<br>*As a user, I want to send notifications, so that other users are informed of relevant updates immediately.* | `通知发送` |
| 8 | **作为**管理员，**我想要**有一个管理后台面板，**以便**统一管理平台上的用户和内容。<br>*As an admin, I want an admin panel, so that I can centrally manage users and content on the platform.* | `Admin pannle Init` |
| 9 | **作为**开发者，**我想要**项目具备清晰合理的目录结构和架构管理，**以便**团队成员更容易维护和扩展代码。<br>*As a developer, I want the project to have a clear and reasonable directory structure, so that team members can more easily maintain and extend the code.* | `优化了目录结构（重构文件位置)`, `Architecture Managed` |
| 10 | **作为**用户，**我想要**在连接成功时看到 Toast 提示，**以便**及时获知连接状态。<br>*As a user, I want to see a Toast notification when the connection succeeds, so that I am promptly informed of the connection status.* | `Change connect success into toast` |

---

## JingyuZhang（张靖宇）

**主要负责方向：** 用户注册与登录、个人主页（Tab4）、活动发布页（Tab5）、JWT 认证、管理后台

| # | User Story | 对应 Commit |
|---|-----------|------------|
| 1 | **作为**新用户，**我想要**通过注册页面创建账号，**以便**使用平台的完整功能。<br>*As a new user, I want to create an account through a registration page, so that I can use the full features of the platform.* | `Add registration page`, `Complete the design of the login page and add verification` |
| 2 | **作为**用户，**我想要**使用账号和密码登录，并经过验证码校验，**以便**安全地进入系统。<br>*As a user, I want to log in with my credentials and pass a verification code check, so that I can securely access the system.* | `Design the login POST request`, `Modify the verification code logic of the login page`, `Optimize the login page` |
| 3 | **作为**用户，**我想要**在 Tab4 个人主页上查看自己的个人资料，**以便**了解和管理自己的账号信息。<br>*As a user, I want to view my personal profile on the Tab4 page, so that I can see and manage my account information.* | `Complete the design of the personal page`, `Optimize the Tab4 page` |
| 4 | **作为**用户，**我想要**编辑 Tab4 上的个人内容（如昵称、简介等），**以便**保持个人信息的准确与最新。<br>*As a user, I want to edit my personal content on Tab4 (e.g., nickname, bio), so that my profile stays accurate and up-to-date.* | `Added the editing function for personal content in Tab 4`, `Add editing function for tab 4` |
| 5 | **作为**用户，**我想要**在 Tab4 删除我发布的活动，**以便**管理和整理我的发布内容。<br>*As a user, I want to delete activities I posted in Tab4, so that I can manage and organize my published content.* | `Added the deletion function for tab4` |
| 6 | **作为**用户，**我想要**通过 Tab5 发布活动或需求，**以便**让其他用户看到并参与我的活动。<br>*As a user, I want to publish activities or requests through Tab5, so that other users can see and join my events.* | `Complete the basic design of the release page`, `Implement the switching function of tab5` |
| 7 | **作为**用户，**我想要**发布活动时支持文件/图片上传，**以便**为我的活动提供更丰富的视觉信息。<br>*As a user, I want to upload files/images when publishing an activity, so that I can provide richer visual information for my event.* | `Update upload.js` |
| 8 | **作为**用户，**我想要**在活动发生变化后，相关页面自动刷新，**以便**始终看到最新的活动信息。<br>*As a user, I want the relevant page to auto-refresh after an activity changes, so that I always see the latest information.* | `Added the function that the page automatically refreshes after an event change` |
| 9 | **作为**已登录用户，**我想要**通过 JWT 进行身份认证，**以便**安全地访问受保护的接口和功能。<br>*As a logged-in user, I want to be authenticated via JWT, so that I can securely access protected APIs and features.* | `Use JWT`, `Implement the identity authentication function` |
| 10 | **作为**开发者，**我想要**通过环境变量统一管理 API 基础地址，**以便**在不同环境（开发/生产）中无需手动修改代码。<br>*As a developer, I want to manage the API base address via environment variables, so that no manual code changes are needed across different environments.* | `Added environment variable configuration for managing API base addresses` |
| 11 | **作为**管理员，**我想要**在后台审核用户提交的内容，**以便**保证平台内容的质量和合规性。<br>*As an admin, I want to review user-submitted content in the backend, so that the quality and compliance of platform content is maintained.* | `Complete the admin review function`, `Create management page` |
| 12 | **作为**管理员，**我想要**在后台管理平台上的用户账号，**以便**处理违规用户或维护用户数据。<br>*As an admin, I want to manage user accounts on the platform backend, so that I can handle violations and maintain user data.* | `Complete the user management function` |
| 13 | **作为**用户，**我想要**注册页面与登录页面保持统一的设计风格，**以便**获得一致、专业的使用体验。<br>*As a user, I want the registration and login pages to have a unified design style, so that I have a consistent and professional user experience.* | `Unified registration and login page design` |

---

## XiaohanLi594（李晓涵）

**主要负责方向：** 首页（Tab1）、聊天列表与聊天室 UI、通知系统、多语言切换

| # | User Story | 对应 Commit |
|---|-----------|------------|
| 1 | **作为**用户，**我想要**在应用首页看到精心设计的活动/任务展示列表，**以便**快速浏览平台上的内容。<br>*As a user, I want to see a well-designed activity/task listing on the app homepage, so that I can quickly browse content on the platform.* | `Preliminary construction of front-end homepage`, `Optimize the homepage`, `home page` |
| 2 | **作为**用户，**我想要**查看聊天列表，**以便**了解我参与的所有对话。<br>*As a user, I want to view my chat list, so that I can see all my ongoing conversations.* | `读取聊天列表信息` |
| 3 | **作为**用户，**我想要**进入聊天室并读取聊天内容，**以便**与活动相关人员进行沟通。<br>*As a user, I want to enter a chat room and read messages, so that I can communicate with people related to an activity.* | `聊天室`, `读取信息` |
| 4 | **作为**开发者，**我想要**将聊天消息连接到数据库进行持久化存储和管理，**以便**聊天记录可靠保存。<br>*As a developer, I want to connect chat messages to a database for persistent storage and management, so that chat history is reliably saved.* | `连接消息数据库`, `Chat message management` |
| 5 | **作为**用户，**我想要**收到活动相关的通知，**以便**及时了解活动动态。<br>*As a user, I want to receive notifications about activities, so that I am informed of activity updates in a timely manner.* | `事件通知` |
| 6 | **作为**用户，**我想要**收到订单相关的通知，**以便**随时了解订单状态变化。<br>*As a user, I want to receive notifications about orders, so that I am always informed about order status changes.* | `订单通知` |
| 7 | **作为**用户，**我想要**在应用内切换中文和英文界面，**以便**使用我熟悉的语言浏览内容。<br>*As a user, I want to switch between Chinese and English in the app, so that I can browse content in my preferred language.* | `实现项目语言切换` |
| 8 | **作为**开发者，**我想要**有统一的 API 管理层，**以便**集中维护所有接口调用，减少代码重复。<br>*As a developer, I want a unified API management layer, so that all interface calls are centrally maintained and code duplication is reduced.* | `API管理` |
| 9 | **作为**用户，**我想要**通知功能更加完善，**以便**在各种场景下都能准确及时地收到通知。<br>*As a user, I want the notification feature to be more comprehensive, so that I receive accurate and timely notifications in various scenarios.* | `优化通知功能` |

---

## shan01dian（陈健源）

**主要负责方向：** 搜索功能（Tab1/Tab2）、卡片详情页、用户详情页、浏览页（Tab2）

| # | User Story | 对应 Commit |
|---|-----------|------------|
| 1 | **作为**用户，**我想要**在平台上搜索活动或服务，**以便**快速找到我需要的内容。<br>*As a user, I want to search for activities or services on the platform, so that I can quickly find the content I need.* | `完成了初步的搜索内容`, `创建了搜索组件`, `完善了search.page` |
| 2 | **作为**用户，**我想要**在首页（Tab1）和浏览页（Tab2）都能使用同一个搜索页面，**以便**获得一致的搜索体验。<br>*As a user, I want to use the same search page in both the homepage (Tab1) and the browse page (Tab2), so that I have a consistent search experience.* | `使tab1与tab2成功调用search页面中，并且都实现了搜索功能` |
| 3 | **作为**用户，**我想要**通过专属搜索页直接跳转到 Tab2 的搜索结果，**以便**提升搜索效率。<br>*As a user, I want to jump directly to Tab2 search results from the dedicated search page, so that my search efficiency is improved.* | `增加了一个新的搜索页，在搜索页搜索可以直达tab2` |
| 4 | **作为**用户，**我想要**点击活动卡片后查看该活动的详细信息，**以便**了解活动的完整内容。<br>*As a user, I want to view detailed information about an activity after clicking its card, so that I can understand the full content of the activity.* | `增加了点击小卡片之后的详情页`, `成功完成了卡片详情页的展示内容` |
| 5 | **作为**用户，**我想要**在活动详情页看到发布者的头像、注册时间、评分和服务次数，**以便**评估服务者的可信度。<br>*As a user, I want to see the publisher's avatar, registration time, rating, and service count on the activity detail page, so that I can assess the provider's credibility.* | `成功在前端读取到数据库中的用户注册时间，评分，服务次数`, `解决了头像问题`, `成功读取任务图标` |
| 6 | **作为**用户，**我想要**点击用户头像或名称后查看该用户的详情页，**以便**进一步了解该用户的信息。<br>*As a user, I want to view a user's detail page after clicking their avatar or name, so that I can learn more about that user.* | `新增用户详情页`, `完善了用户详情页面` |
| 7 | **作为**用户，**我想要**在用户详情页中点击进入该用户发布的活动详情，**以便**快速浏览该用户的所有活动。<br>*As a user, I want to navigate to the detail page of activities published by a user from their profile, so that I can quickly browse all their activities.* | `在用户详情页可以点击进入活动详情` |
| 8 | **作为**用户，**我想要**在未登录状态下点击收藏、聊一聊、关注等按钮时被跳转到登录页，**以便**保护这些功能的访问权限。<br>*As a guest user, I want to be redirected to the login page when clicking buttons like Favorite, Chat, or Follow without being logged in, so that access to these features is protected.* | `用户没有登陆的时候，订单详情的收藏，聊一聊，关注这些全部跳转到登陆页` |
| 9 | **作为**用户，**我想要**每个页面都有正确的返回逻辑，**以便**流畅地进行页面导航。<br>*As a user, I want every page to have a correct back navigation, so that I can navigate between pages smoothly.* | `完善所有页面的返回逻辑` |
| 10 | **作为**开发者，**我想要**通过注入 AuthService 统一判断用户的登录状态，**以便**在各页面中复用认证逻辑，减少重复代码。<br>*As a developer, I want to inject AuthService to uniformly check the user's login status, so that authentication logic is reused across pages and code duplication is reduced.* | `通过注入 AuthService 来获取当前用户是否登录` |
| 11 | **作为**用户，**我想要**浏览页（Tab2）的内容展示逻辑更加合理，**以便**获得更好的浏览体验。<br>*As a user, I want the display logic of the browse page (Tab2) to be more rational, so that I get a better browsing experience.* | `优化tab2的显示逻辑` |
| 12 | **作为**用户，**我想要**搜索页面的交互逻辑更加顺畅，**以便**高效地找到目标内容。<br>*As a user, I want the interaction logic of the search page to be smoother, so that I can efficiently find the target content.* | `优化了搜索页面以及搜索逻辑` |
| 13 | **作为**用户，**我想要**活动卡片的样式更加美观，**以便**获得更好的视觉体验。<br>*As a user, I want the activity card styles to be more visually appealing, so that I have a better visual experience.* | `更改卡片样式` |
