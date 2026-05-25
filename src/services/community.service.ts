import { Comment, Contributor, Notification, VoucherRequest } from '@/lib/types';
import { apiRequest } from './api-client';

export const communityService = {
  async listComments(voucherId: string) {
    const { comments } = await apiRequest<{ comments: Comment[] }>(`/api/vouchers/${voucherId}/comments`);
    return comments.map((comment) => ({ ...comment, createdAt: new Date(comment.createdAt) }));
  },

  async addComment(voucherId: string, text: string) {
    return apiRequest<{ comment: Comment }>(`/api/vouchers/${voucherId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  async listRequests() {
    const { requests } = await apiRequest<{ requests: VoucherRequest[] }>('/api/requests');
    return requests.map((request) => ({ ...request, createdAt: new Date(request.createdAt) }));
  },

  async createRequest(input: Pick<VoucherRequest, 'title' | 'description' | 'category'>) {
    return apiRequest<{ request: VoucherRequest }>('/api/requests', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async listNotifications() {
    const { notifications } = await apiRequest<{ notifications: Notification[] }>('/api/notifications');
    return notifications.map((notification) => ({ ...notification, createdAt: new Date(notification.createdAt) }));
  },

  async markNotificationRead(id: string) {
    return apiRequest<{ notification: Notification }>(`/api/notifications/${id}/read`, { method: 'PATCH' });
  },

  async leaderboard() {
    const { contributors } = await apiRequest<{ contributors: Contributor[] }>('/api/leaderboard');
    return contributors;
  },

  async activities() {
    const { activities } = await apiRequest<{ activities: any[] }>('/api/activities');
    return activities.map((activity) => ({ ...activity, createdAt: new Date(activity.createdAt) }));
  },
};
