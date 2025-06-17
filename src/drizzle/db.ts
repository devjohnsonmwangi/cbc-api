// import { drizzle } from "drizzle-orm/postgres-js";
// import  postgres from "postgres";

// import * as schema from "./schema"

// // Initialize Supabase client (only needed if you want to use Supabase Storage or Auth directly in this file)
// // import { createClient } from '@supabase/supabase-js'
// // const supabaseUrl = process.env.SUPABASE_URL;
// // const supabaseKey = process.env.SUPABASE_ANON_KEY;
// // export const supabase = createClient(supabaseUrl!, supabaseKey!);


// // Use postgres.js to connect to Supabase
// const queryClient = postgres(process.env.DATABASE_URL as string);

// // Create the Drizzle ORM database instance
// const db = drizzle(queryClient, { schema, logger: true });

// export default db;