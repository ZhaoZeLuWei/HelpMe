//this service use <API>
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ServeAPIService {
  // 基础URL
  private baseUrl = 'http://localhost:3000';

  // 认证审核相关URL
  private adminVerifyUrl = `${this.baseUrl}/adminVerify`;
  private adminVerifyDetailUrl = `${this.baseUrl}/adminVerify/detail`;
  private adminVerifyApproveUrl = `${this.baseUrl}/adminVerify/approve`;
  private adminVerifyRejectUrl = `${this.baseUrl}/adminVerify/reject`;

  // 人员管理相关URL
  private adminUsersUrl = `${this.baseUrl}/admin/users`;

  private http = inject(HttpClient);

  // 获取基础URL
  getBaseUrl(): string {
    return this.baseUrl;
  }

  // ========== 认证审核相关 ==========

  // 获取所有providers及其认证状态（用于人员管理列表）
  getAdminVerifyList(): Observable<any> {
    return this.http.get<any>(this.adminVerifyUrl);
  }

  // 获取认证详情（包含用户信息和照片）
  getVerifyDetail(providerId: number): Observable<any> {
    return this.http.get<any>(`${this.adminVerifyDetailUrl}/${providerId}`);
  }

  // 审核通过
  approveVerification(providerId: number, results: string): Observable<any> {
    return this.http.post<any>(this.adminVerifyApproveUrl, {
      providerId,
      results,
    });
  }

  // 审核驳回
  rejectVerification(providerId: number, results: string): Observable<any> {
    return this.http.post<any>(this.adminVerifyRejectUrl, {
      providerId,
      results,
    });
  }

  // ========== 人员管理相关 ==========

  // 获取所有用户列表
  getAdminUsersList(): Observable<any> {
    return this.http.get<any>(this.adminUsersUrl);
  }

  // 获取用户详情
  getUserDetail(userId: number): Observable<any> {
    return this.http.get<any>(`${this.adminUsersUrl}/${userId}`);
  }

  // 删除用户
  deleteUser(userId: number): Observable<any> {
    return this.http.delete<any>(`${this.adminUsersUrl}/${userId}`);
  }
}
