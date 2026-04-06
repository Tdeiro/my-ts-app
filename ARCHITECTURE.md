Project Structure Guidelines
Folder Structure

We follow a feature-based architecture:

src/
├── features/
│ └── /
│ ├── components/
│ ├── hooks/
│ ├── services/
│ ├── types/
│ └── pages/

Rules
Components must be presentational when possible
Business logic should be placed in hooks
API calls must go inside services
Styles must use CSS Modules (.module.css)
Types must be defined in types/
Naming Conventions
Components: PascalCase (UserList.tsx)
Hooks: camelCase starting with "use" (useUsers.ts)
Services: camelCase (userService.ts)
Example

features/users/components/UserList.tsx
features/users/hooks/useUsers.ts
features/users/services/userService.ts

Example:

src/
 ├── features/
 │    └── users/
 │         ├── components/
 │         │    ├── UserList.tsx
 │         │    ├── UserList.module.css
 │         │
 │         ├── hooks/
 │         │    └── useUsers.ts
 │         │
 │         ├── services/
 │         │    └── userService.ts
 │         │
 │         ├── types/
 │         │    └── user.ts
 │         │
 │         └── pages/
 │              └── UsersPage.tsx
 │
 ├── shared/
 │    ├── components/
 │    ├── hooks/
 │    └── services/
 │
 └── App.tsx

🧠 Service (like Angular service)
export async function getUsers() {
  const res = await fetch("/api/users");
  return res.json();
}

🔁 Hook (React replacement for service usage)
import { useEffect, useState } from "react";
import { getUsers } from "../services/userService";

export function useUsers() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    getUsers().then(setUsers);
  }, []);

  return users;
}

🎨 Component (HTML + TS + CSS together)
import styles from "./UserList.module.css";

export function UserList({ users }) {
  return (
    <ul className={styles.list}>
      {users.map(u => <li key={u.id}>{u.name}</li>)}
    </ul>
  );
}

📄 Page (container / smart component)
import { useUsers } from "../hooks/useUsers";
import { UserList } from "../components/UserList";

export function UsersPage() {
  const users = useUsers();
  return <UserList users={users} />;
}



