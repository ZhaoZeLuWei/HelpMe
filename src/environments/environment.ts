// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  apiBase: 'http://localhost:3000', // 后端 API 基础地址
  // 阿里云图形验证码 H5 SDK（需下载 ct4.js 放到 src/assets/ 目录）
  captchaScriptUrl: '/assets/ct4.js',
  captchaId: '96409edc5cae0a136d3d5b4fe928045b',
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
