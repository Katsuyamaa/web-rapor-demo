import client from './client';

export const getRoadmapItems = (params = {}) =>
  client.get('/roadmap', { params }).then(r => r.data);

export const createRoadmapItem = (data) =>
  client.post('/roadmap', data).then(r => r.data);

export const updateRoadmapItem = (id, data) =>
  client.patch(`/roadmap/${id}`, data).then(r => r.data);

export const deleteRoadmapItem = (id) =>
  client.delete(`/roadmap/${id}`).then(r => r.data);
