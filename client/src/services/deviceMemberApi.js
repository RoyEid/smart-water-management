import api from "./api";

export async function fetchDeviceMembers(deviceId) {
  const { data } = await api.get(`/devices/${deviceId}/members`);
  return data.members || [];
}

export async function addDeviceMember(deviceId, { email, role, nickname = "" }) {
  const { data } = await api.post(`/devices/${deviceId}/members`, {
    email,
    role,
    nickname,
  });
  return data;
}

export async function updateDeviceMemberRole(deviceId, memberId, { role, nickname }) {
  const { data } = await api.patch(`/devices/${deviceId}/members/${memberId}`, {
    role,
    nickname,
  });
  return data;
}

export async function removeDeviceMember(deviceId, memberId) {
  const { data } = await api.delete(`/devices/${deviceId}/members/${memberId}`);
  return data;
}
