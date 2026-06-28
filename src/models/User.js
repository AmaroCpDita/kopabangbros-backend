export const users = [];

export class User {
  constructor(name, email, password) {
    this.id = Date.now().toString();
    this.name = name;
    this.email = email;
    this.password = password; // In a real app, this should be hashed
    this.groupId = null;
  }
}
