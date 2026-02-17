
import { getSupabase } from './cloud';

/**
 * INVITE USER (Admin Only)
 * Ideally this calls a Supabase Edge Function to safely use the Service Role Key.
 * For this demo, we assume the edge function exists at 'invite-user'.
 */
export const inviteUser = async (email: string, fullName: string, role: string, sponsorId?: string) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("No connection");

    // CALL EDGE FUNCTION
    const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email, fullName, role, sponsorId }
    });

    if (error) {
        console.error("Invite failed", error);
        throw new Error("Impossibile inviare invito. Verifica permessi o funzione.");
    }

    return data;
};

/**
 * CHANGE SPONSOR (Admin Only)
 * Updates the team_edges table to close old relationship and open new one.
 */
export const changeSponsor = async (childId: string, newParentId: string | null) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("No connection");
    
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error("Unauthorized");

    // 1. Close active edge
    const { error: closeError } = await supabase
        .from('team_edges')
        .update({ valid_to: new Date().toISOString() })
        .eq('child_id', childId)
        .is('valid_to', null);
    
    if (closeError) throw closeError;

    // 2. Create new edge
    const { error: createError } = await supabase
        .from('team_edges')
        .insert({
            child_id: childId,
            parent_id: newParentId,
            valid_from: new Date().toISOString(),
            valid_to: null,
            created_by: user.id
        });

    if (createError) throw createError;
    
    return true;
};

/*
    === SUPABASE EDGE FUNCTION CODE (Reference) ===
    
    import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
    import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

    serve(async (req) => {
      const { email, fullName, role, sponsorId } = await req.json();
      
      // Create Supabase Admin Client
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // 1. Create User in Auth
      const { data: user, error: createError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
      if (createError) return new Response(JSON.stringify({ error: createError.message }), { status: 400 });

      const userId = user.user.id;

      // 2. Update Profile (Trigger might create it, but we update details)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({ 
            user_id: userId, 
            email: email, 
            full_name: fullName, 
            role: role 
        });

      // 3. Set Sponsor (Edge)
      if (sponsorId) {
         await supabaseAdmin.from('team_edges').insert({
             child_id: userId,
             parent_id: sponsorId
         });
      }

      return new Response(JSON.stringify({ success: true, userId }), { headers: { "Content-Type": "application/json" } });
    })
*/
