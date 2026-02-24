import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.2'
import { corsHeaders } from '../_shared/cors.ts'; // Assuming you have CORS headers utility

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, roomId, isHost } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // First, remove the participant (even if they are host, they are leaving)
    const { error: deleteParticipantError } = await supabaseAdmin
      .from('battle_participants')
      .delete()
      .eq('battle_room_id', roomId)
      .eq('user_id', userId);

    if (deleteParticipantError) {
      console.error('Error deleting participant:', deleteParticipantError.message);
      return new Response(JSON.stringify({ error: deleteParticipantError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (isHost) {
      // If the user who just left was the host, elect a new host
      const { data: remainingParticipants, error: participantsError } = await supabaseAdmin
        .from('battle_participants')
        .select('user_id, id, created_at') // Select created_at for accurate sorting
        .eq('battle_room_id', roomId)
        .order('created_at', { ascending: true }); // Order by creation time to get the earliest

      if (participantsError) {
        console.error('Error fetching remaining participants:', participantsError.message);
        return new Response(JSON.stringify({ error: participantsError.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      if (remainingParticipants && remainingParticipants.length > 0) {
        // Elect the new host (the one who joined earliest)
        const newHostId = remainingParticipants[0].user_id;

        const { error: updateRoomError } = await supabaseAdmin
          .from('battle_rooms')
          .update({ host_id: newHostId })
          .eq('id', roomId);

        if (updateRoomError) {
          console.error('Error updating new host_id:', updateRoomError.message);
          return new Response(JSON.stringify({ error: updateRoomError.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          });
        }
        console.log(`Host migrated for room ${roomId} to user ${newHostId}`);
      } else {
        // No participants left, delete the room
        const { error: deleteRoomError } = await supabaseAdmin
          .from('battle_rooms')
          .delete()
          .eq('id', roomId);

        if (deleteRoomError) {
          console.error('Error deleting empty room:', deleteRoomError.message);
          return new Response(JSON.stringify({ error: deleteRoomError.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          });
        }
        console.log(`Room ${roomId} deleted as no participants remain.`);
      }
    }

    return new Response(JSON.stringify({ message: 'Leave room logic processed successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Function error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});