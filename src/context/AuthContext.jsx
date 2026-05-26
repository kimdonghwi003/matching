import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nickname: profile.nickname, name: profile.name, student_id: profile.studentId } },
    });
    if (error) return { data, error };

    // 트리거가 public.users를 자동 생성하지만, 클라이언트에서도 시도 (이중 보장)
    if (data.user) {
      await supabase.from('users').insert({
        id: data.user.id,
        student_id: profile.studentId,
        name: profile.name,
        nickname: profile.nickname,
      }).then(() => {});
    }

    // 회원가입 직후 자동 로그인 시도 (이메일 인증이 비활성화된 경우 즉시 로그인)
    if (data.user && !data.session) {
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (!signInErr && signInData.session) {
        return { data: signInData, error: null, autoLoggedIn: true };
      }
    }

    return { data, error: null };
  };

  const signOut = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
