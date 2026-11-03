import React, { useEffect, useState } from 'react';
import { createClient } from './utils/supabase/client';

export default function Page() {
  const [todos, setTodos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();
        const { data } = await supabase.from('todos').select('*');
        if (data) setTodos(data);
      } catch (err) {
        console.warn('Todos query:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <ul>
      {todos?.map((todo: any) => (
        <li key={todo.id}>{todo.name || todo.title || JSON.stringify(todo)}</li>
      ))}
    </ul>
  );
}
