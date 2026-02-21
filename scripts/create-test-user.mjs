import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envText = fs.readFileSync(".env.local", "utf8");
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => !line.trim().startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(url, key);

const email = "test.financepro.demo@gmail.com";
const password = "DemoFinancePro#2026";
const fullName = "Usuario Demo FinancePro";

const signUp = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: fullName,
    },
  },
});

if (
  signUp.error &&
  !String(signUp.error.message).toLowerCase().includes("already")
) {
  console.error("SIGNUP_ERROR:", signUp.error.message);
  process.exit(1);
}

const signIn = await supabase.auth.signInWithPassword({ email, password });

if (signIn.error) {
  if (String(signIn.error.message).toLowerCase().includes("email not confirmed")) {
    console.log(
      JSON.stringify(
        {
          email,
          password,
          created: !signUp.error,
          loginReady: false,
          reason: "Email not confirmed",
          nextStep:
            "Configura email en Supabase Auth y confirma/reenvía email desde /login",
        },
        null,
        2
      )
    );
    process.exit(0);
  }

  console.error("SIGNIN_ERROR:", signIn.error.message);
  process.exit(1);
}

const userId = signIn.data.user?.id;

if (userId) {
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId,
    full_name: fullName,
    email,
  });

  if (profileError) {
    console.error("PROFILE_UPSERT_WARNING:", profileError.message);
  }
}

console.log(
  JSON.stringify(
    {
      email,
      password,
      userId,
      created: !signUp.error,
    },
    null,
    2
  )
);
