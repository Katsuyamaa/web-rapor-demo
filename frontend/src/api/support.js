import client from './client';

export const getTickets = (params = {}) =>
  client.get('/support/tickets', { params }).then(r => r.data);

export const createTicket = (data) =>
  client.post('/support/tickets', data).then(r => r.data);

export const getTicket = (id) =>
  client.get(`/support/tickets/${id}`).then(r => r.data);

export const updateTicket = (id, data) =>
  client.patch(`/support/tickets/${id}`, data).then(r => r.data);

export const addComment = (id, comment) =>
  client.post(`/support/tickets/${id}/comments`, { comment }).then(r => r.data);

export const getUnreadCount = () =>
  client.get('/support/tickets/unread_count').then(r => r.data);

export const deleteTicket = (id) =>
  client.delete(`/support/tickets/${id}`).then(r => r.data);
