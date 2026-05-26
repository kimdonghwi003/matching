import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signUp = async (email, password, profile) => {
    let userId = null;

    if (supabaseAdmin) {
      // Admin API: 이메일 발송 없이 즉시 인증된 유저 생성
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          nickname:   profile.nickname,
          name:       profile.name,
          student_id: profile.studentId,
        },
      });
      if (error) return { data, error };
      userId = data.user?.id;

      // public.users 저장 (RLS 우회)
      if (userId) {
        await supabaseAdmin.from('users').insert({
          id:         userId,
          student_id: profile.studentId,
          name:       profile.name,
          nickname:   profile.nickname,
        }).then(() => {});
      }
    } else {
      // Admin 키 없을 때 fallback (이메일 인증 필요)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nickname: profile.nickname, name: profile.name, student_id: profile.studentId } },
      });
      if (error) return { data, error };
      userId = data.user?.id;
      if (userId) {
        await supabase.from('users').insert({
          id: userId, student_id: profile.studentId, name: profile.name, nickname: profile.nickname,
        }).then(() => {});
      }
      if (data.session) return { data, error: null, autoLoggedIn: true };
      return { data, error: null };
    }

    // 즉시 로그인
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) return { data: null, error: signInErr };
    return { data: signInData, error: null, autoLoggedIn: true };
  };

  const signOut = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
