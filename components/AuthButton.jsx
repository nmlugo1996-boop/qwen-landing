"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "../lib/supabaseClient";

export default function AuthButton() {
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getSession().then(({ data }) => setSession(data?.session ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogin = useCallback(async () => {
    setLoading(true);
    try {
      const email = window.prompt("Введите e-mail для magic link:");
      if (!email) return;
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      alert("Письмо с ссылкой отправлено. Проверьте почту.");
    } catch (error) {
      console.error(error);
      alert(error.message || "Не удалось отправить ссылку.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createBrowserClient();
      await supabase.auth.signOut();
    } catch (error) {
      console.error(error);
      alert(error.message || "Не удалось выйти");
    } finally {
      setLoading(false);
    }
  }, []);

  if (session?.user) {
    return (
      <button
        className="btn-ghost w-full justify-center border-white/15 bg-white/10 text-white sm:w-auto"
        onClick={handleLogout}
        disabled={loading}
      >
        Выйти
      </button>
    );
  }

  return (
    <button
      className="btn-ghost w-full justify-center border-white/15 bg-white/10 text-white sm:w-auto"
      onClick={handleLogin}
      disabled={loading}
    >
      Войти
    </button>
  );
}

