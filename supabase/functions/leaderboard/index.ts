// supabase/functions/leaderboard/index.ts

// These imports are for running server-side code in Deno (Supabase Edge Functions use Deno)
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.1'; // Make sure this version is up-to-date and matches your client-side if possible

// This function will be executed when the Edge Function is called
serve(async (req) => {
  // Only allow GET requests to this function
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Initialize Supabase client for the function.
  // Deno.env.get accesses environment variables set by Supabase for your project.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') as string,
    Deno.env.get('SUPABASE_ANON_KEY') as string
  );

  try {
    // 1. Get all user answers from the 'user_answers' table
    const { data: userAnswers, error: answersError } = await supabase
      .from('user_answers')
      .select(`
        user_id,
        is_correct,
        time_taken,
        created_at
      `);
    
    if (answersError) {
      console.error('Error fetching user answers:', answersError);
      return new Response(JSON.stringify({ error: answersError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Get all profiles from the 'profiles' table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name');
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return new Response(JSON.stringify({ error: profilesError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Calculate user statistics (This is the exact logic from your frontend!)
    // Using a Record<string, any> for simplicity, normally define a type
    const userStats: Record<string, any> = {};
    
    userAnswers?.forEach(answer => {
      if (!userStats[answer.user_id]) {
        userStats[answer.user_id] = {
          user_id: answer.user_id,
          totalQuestions: 0,
          correctAnswers: 0,
          totalTime: 0,
          answers: [] // Store answers to calculate streak later
        };
      }
      
      userStats[answer.user_id].totalQuestions++;
      if (answer.is_correct) {
        userStats[answer.user_id].correctAnswers++;
      }
      // Ensure time_taken is treated as a number, default to 0 if null/undefined
      userStats[answer.user_id].totalTime += answer.time_taken || 0;
      userStats[answer.user_id].answers.push(answer);
    });

    // 4. Create leaderboard entries by combining profile data with calculated stats
    const leaderboardEntries = profiles
      ?.filter(profile => userStats[profile.id]?.totalQuestions > 0) // Only include users who have answered questions
      .map(profile => {
        const stats = userStats[profile.id];

        // Calculate streak (same logic as your frontend)
        let currentStreak = 0;
        let bestStreak = 0;
        stats.answers
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .forEach((answer: any) => {
            if (answer.is_correct) {
              currentStreak++;
              bestStreak = Math.max(bestStreak, currentStreak);
            } else {
              currentStreak = 0;
            }
          });

        const accuracy = stats.totalQuestions > 0 ? 
          Math.round((stats.correctAnswers / stats.totalQuestions) * 100) : 0;
        
        const averageTime = stats.totalQuestions > 0 ? 
          Math.round(stats.totalTime / stats.totalQuestions) : 0;

        // Calculate total score (your improved formula)
        const basePoints = stats.correctAnswers * 10; // 10 points per correct answer
        const streakBonus = bestStreak * 5; // 5 points per best streak
        const accuracyBonus = accuracy; // 1 point per 1% accuracy
        const speedBonus = Math.max(0, 60 - averageTime); // Bonus for faster answers (assuming 60s max)
        
        const totalScore = basePoints + streakBonus + accuracyBonus + speedBonus;

        return {
          id: profile.id, // Keep the profile ID for uniqueness
          user_id: profile.id, // User ID from profile
          username: profile.username || profile.full_name || 'Anonymous', // Fallback username
          total_score: totalScore,
          accuracy,
          best_streak: bestStreak,
          total_questions: stats.totalQuestions,
          correct_answers: stats.correctAnswers
        };
      }) || []; // Ensure it defaults to an empty array if profiles is null/undefined

    // 5. Sort by total score and return top 50 (same logic as your frontend)
    const sortedLeaderboard = leaderboardEntries
      .sort((a, b) => b.total_score - a.total_score)
      .slice(0, 50);

    // Return the sorted leaderboard data as a JSON response
    return new Response(JSON.stringify(sortedLeaderboard), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        // CORS headers are crucial for your frontend to be able to call this function
        // For development, '*' is fine. In production, replace with your actual frontend domain(s).
        'Access-Control-Allow-Origin': '*', 
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey'
      },
    });

  } catch (error) {
    console.error('Error in Edge Function:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});