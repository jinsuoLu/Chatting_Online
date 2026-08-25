import { defineConfig } from 'vitest/config';
export default defineConfig({test:{environment:'jsdom',setupFiles:['./test/setup.ts'],include:['./components/visitor-chat.test.tsx'],globals:true}});
