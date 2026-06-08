/**
 * 服务角色相关工具函数
 */

/**
 * 根据 ProviderRole 返回对应的颜色
 * 1=热心者(warning), 2=专业者(success), 3=商家(success), 其他=普通(medium)
 */
export function getServiceRoleColor(providerRole: number): string {
  switch (providerRole) {
    case 1:
      return 'warning';
    case 2:
      return 'success';
    case 3:
      return 'success';
    default:
      return 'medium';
  }
}

/**
 * 根据 ProviderRole 返回对应的文本（需要传入翻译对象）
 */
export function getServiceRoleText(
  providerRole: number,
  translations: {
    roleEnthusiast: string;
    roleProfessional: string;
    roleMerchant: string;
    roleRegular: string;
  },
): string {
  switch (providerRole) {
    case 1:
      return translations.roleEnthusiast;
    case 2:
      return translations.roleProfessional;
    case 3:
      return translations.roleMerchant;
    default:
      return translations.roleRegular;
  }
}
