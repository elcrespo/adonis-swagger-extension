export interface User {
    id: number;
    email: string;
    profile: {
        firstName: string;
        lastName?: string;
        age: number;
        metadata: {
            active: boolean;
            lastLogin: string | null;
        }
    };
    roles: string[];
}
