import { WorkerPreset } from "graphile-worker";

const preset = {
  extends: [WorkerPreset],
  worker: {
    // Use environment variables for configuration
    connectionString: process.env.DATABASE_URL || `postgres://${process.env.SUPABASE_DB_PASSWORD}@db.${process.env.SUPABASE_PROJECT_ID}.supabase.co:5432/postgres`,
    schema: "graphile_worker",
    taskDirectory: `${process.cwd()}/app/workers/tasks`,
    concurrentJobs: 5,
    pollInterval: 1000,
    // Add other configuration options as needed
    maxPoolSize: 10,
    preparedStatements: true,
    // Use JavaScript task files
    fileExtensions: [".js"],
  },
};

export default preset;
