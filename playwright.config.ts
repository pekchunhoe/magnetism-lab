import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./e2e',fullyParallel:false,workers:1,timeout:60000,
  reporter:[['list'],['json',{outputFile:'artifacts/browser-audit/tests.json'}]],
  use:{baseURL:process.env.LAB_URL||'http://127.0.0.1:5173',viewport:{width:1536,height:1100},reducedMotion:'reduce',screenshot:'only-on-failure',trace:'retain-on-failure'},
  webServer:{command:'npm run dev -- --port 5173 --strictPort',url:'http://127.0.0.1:5173',reuseExistingServer:true}
});
