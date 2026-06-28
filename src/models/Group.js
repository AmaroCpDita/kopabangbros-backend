export const groups = [];

export class Group {
  constructor(name, adminId) {
    this.id = Date.now().toString();
    this.name = name;
    this.adminId = adminId;
    this.inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase(); // 6 chars code
    this.members = [adminId]; // array of user IDs
  }
}
