import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom'; // Import useLocation and useNavigate
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ProfileDropdown } from '@/components/ProfileDropdown'; // NEW: Import ProfileDropdown

// Import the new components
import { GroupsDisplay } from '@/components/classroom/GroupsDisplay';
import { MessageScreen } from '@/components/classroom/MessageScreen';
import { ElasticWrapper } from '@/components/ElasticWrapper'
import Seo from '@/components/Seo'; // Import the Seo component

// Type definitions (re-defined here for component self-containment)
interface Classroom {
  id: string;
  created_at: string;
  name: string;
  description: string | null;
  is_public: boolean;
  host_id: string;
  invite_code: string | null;
  host_name?: string;
}

interface ClassroomMember {
  id: string;
  created_at: string;
  user_id: string;
  classroom_id: string;
  role: string;
  user_name?: string;
}

interface ClassroomMessage {
  id: string;
  created_at: string;
  classroom_id: string;
  user_id: string;
  content: string;
  user_name?: string;
}

type ClassroomView = 'list' | 'chat';

export const Classroom = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation(); // Hook to access URL parameters
  const navigate = useNavigate(); // Hook to navigate programmatically

  const [currentView, setCurrentView] = useState<ClassroomView>('list');
  const [myClassrooms, setMyClassrooms] = useState<Classroom[]>([]);
  const [discoverClassrooms, setDiscoverClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [messages, setMessages] = useState<ClassroomMessage[]>([]);
  const [members, setMembers] = useState<ClassroomMember[]>([]);
  const [newMessageContent, setNewMessageContent] = useState('');

  const [showCreateClassroomModal, setShowCreateClassroomModal] = useState(false);
  const [newClassroomName, setNewClassroomName] = useState('');
  const [newClassroomDescription, setNewClassroomDescription] = useState('');
  const [newClassroomIsPublic, setNewClassroomIsPublic] = useState(true);
  const [isCreatingClassroom, setIsCreatingClassroom] = useState(false);
  const [isJoiningClassroom, setIsJoiningClassroom] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null); // New state for the invite link

  const appDomain = import.meta.env.VITE_APP_DOMAIN || window.location.origin; // Get your app's domain


  const fetchClassrooms = useCallback(async () => {
    if (!user) return;

    try {
      const { data: publicClassroomsRaw, error: publicError } = await supabase
        .from('classrooms')
        .select('*')
        .eq('is_public', true);

      if (publicError) throw publicError;

      const { data: userMemberships, error: membershipsError } = await supabase
        .from('classroom_members')
        .select('classroom_id')
        .eq('user_id', user.id);

      if (membershipsError) throw membershipsError;

      const userMemberClassroomIds = new Set(userMemberships.map(m => m.classroom_id));

      const { data: memberClassroomsData, error: memberClassroomsError } = await supabase
        .from('classroom_members')
        .select('classroom_id, classrooms(*)')
        .eq('user_id', user.id);

      if (memberClassroomsError) throw memberClassroomsError;

      const myClassroomsRaw = memberClassroomsData.map(m => m.classrooms).filter(Boolean) as Classroom[];

      const allRelevantClassrooms = [...publicClassroomsRaw, ...myClassroomsRaw];
      const allUserIdsToFetchProfiles = new Set<string>();
      allRelevantClassrooms.forEach(c => allUserIdsToFetchProfiles.add(c.host_id));
      myClassroomsRaw.forEach(c => allUserIdsToFetchProfiles.add(c.host_id));

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', Array.from(allUserIdsToFetchProfiles));

      if (profilesError) throw profilesError;

      const profilesMap = new Map(profilesData.map(p => [p.id, p.full_name]));

      const myClassroomsWithHostNames = myClassroomsRaw.map(c => ({
        ...c,
        host_name: profilesMap.get(c.host_id) || 'Unknown Host'
      }));
      setMyClassrooms(myClassroomsWithHostNames);

      const discoverable = publicClassroomsRaw.filter(
        (classroom: Classroom) => !userMemberClassroomIds.has(classroom.id)
      ).map((classroom: Classroom) => ({
        ...classroom,
        host_name: profilesMap.get(classroom.host_id) || 'Unknown Host'
      }));
      setDiscoverClassrooms(discoverable);

    } catch (error: any) {
      console.error('Error fetching classrooms:', error.message);
      toast({
        title: "Error",
        description: `Failed to load classrooms: ${error.message}`,
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const fetchMessages = useCallback(async (classroomId: string) => {
    try {
      const { data: messagesRaw, error } = await supabase
        .from('classroom_messages')
        .select('*')
        .eq('classroom_id', classroomId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const userIds = Array.from(new Set(messagesRaw.map(msg => msg.user_id)));

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(profilesData.map(p => [p.id, p.full_name]));

      setMessages(messagesRaw.map(msg => ({
        ...msg,
        user_name: profilesMap.get(msg.user_id) || 'Unknown User'
      })));
    } catch (error: any) {
      console.error('Error fetching messages:', error.message);
      toast({
        title: "Error",
        description: `Failed to load messages: ${error.message}`,
        variant: "destructive",
      });
    }
  }, [supabase, toast]);

  const fetchMembers = useCallback(async (classroomId: string) => {
    try {
      const { data: membersRaw, error } = await supabase
        .from('classroom_members')
        .select('*')
        .eq('classroom_id', classroomId);

      if (error) throw error;

      const userIds = Array.from(new Set(membersRaw.map(member => member.user_id)));

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(profilesData.map(p => [p.id, p.full_name]));

      setMembers(membersRaw.map(member => ({
        ...member,
        user_name: profilesMap.get(member.user_id) || 'Unknown User'
      })));
    } catch (error: any) {
      console.error('Error fetching members:', error.message);
      toast({
        title: "Error",
        description: `Failed to load members: ${error.message}`,
        variant: "destructive",
      });
    }
  }, [supabase, toast]);

  // --- NEW: handleInviteLinkJoin function to process the invite code ---
  const handleInviteLinkJoin = useCallback(async (inviteCode: string) => {
    if (!user) {
      // If user is not logged in, redirect to login with a comeback URL
      navigate(`/login?redirectTo=/classrooms?code=${inviteCode}`);
      toast({
        title: "Login Required",
        description: "Please log in to join the classroom via invite link.",
        variant: "default",
      });
      return;
    }

    setIsJoiningClassroom(true);
    try {
      const { data: classroomToJoin, error } = await supabase
        .from('classrooms')
        .select('id, name, host_id, is_public')
        .eq('invite_code', inviteCode)
        .maybeSingle();

      if (error) throw error;

      if (!classroomToJoin) {
        toast({
          title: "Error",
          description: "Invalid or expired invite link.",
          variant: "destructive",
        });
        return;
      }

      // Check if user is already a member
      const { data: existingMember, error: memberCheckError } = await supabase
        .from('classroom_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('classroom_id', classroomToJoin.id)
        .maybeSingle();

      if (memberCheckError) throw memberCheckError;

      if (existingMember) {
        toast({
          title: "Already a Member",
          description: `You are already a member of "${classroomToJoin.name}".`,
          variant: "default",
        });
        // Select the classroom and go to chat if already a member
        const { data: hostProfile, error: hostProfileError } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', classroomToJoin.host_id)
          .maybeSingle();
        if (hostProfileError) console.error('Error fetching host profile:', hostProfileError.message);
        setSelectedClassroom({ ...classroomToJoin, host_name: hostProfile?.full_name || 'Unknown' });
        setCurrentView('chat');
        // Clear the URL parameter after successful processing
        navigate('/classrooms', { replace: true });
        return;
      }

      // Add user as a member
      const { error: joinError } = await supabase
        .from('classroom_members')
        .insert({
          user_id: user.id,
          classroom_id: classroomToJoin.id,
          role: 'member',
        });

      if (joinError) throw joinError;

      toast({
        title: "Success!",
        description: `Successfully joined "${classroomToJoin.name}".`,
      });
      fetchClassrooms();

      const { data: hostProfile, error: hostProfileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', classroomToJoin.host_id)
        .maybeSingle();

      if (hostProfileError) console.error('Error fetching host profile after join:', hostProfileError.message);

      setSelectedClassroom({ ...classroomToJoin, host_name: hostProfile?.full_name || 'Unknown' });
      setCurrentView('chat');
      // Clear the URL parameter after successful processing
      navigate('/classrooms', { replace: true });

    } catch (error: any) {
      console.error('Error joining classroom via invite link:', error.message);
      toast({
        title: "Error",
        description: `Failed to join classroom: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsJoiningClassroom(false);
    }
  }, [user, supabase, toast, fetchClassrooms, navigate, setSelectedClassroom, setCurrentView]);

  useEffect(() => {
    if (!user) return;
    fetchClassrooms();

    // Check for invite code in URL on initial load or user change
    const queryParams = new URLSearchParams(location.search);
    const inviteCode = queryParams.get('code');
    if (inviteCode) {
      handleInviteLinkJoin(inviteCode);
    }
  }, [user, fetchClassrooms, location.search, handleInviteLinkJoin]);

  useEffect(() => {
    if (selectedClassroom) {
      fetchMessages(selectedClassroom.id);
      fetchMembers(selectedClassroom.id);

      const messageChannel = supabase
        .channel(`classroom_messages:${selectedClassroom.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'classroom_messages', filter: `classroom_id=eq.${selectedClassroom.id}` },
          async (payload: any) => {
            if (payload.eventType === 'INSERT') {
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', payload.new.user_id)
                .maybeSingle();

              if (profileError) {
                console.error('Error fetching profile for new message:', profileError.message);
              }

              setMessages(prev => [
                ...prev,
                {
                  ...payload.new,
                  user_name: profileData?.full_name || 'Unknown User'
                }
              ]);
            }
          }
        )
        .subscribe();

      const memberChannel = supabase
        .channel(`classroom_members:${selectedClassroom.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'classroom_members', filter: `classroom_id=eq.${selectedClassroom.id}` },
          async (payload: any) => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
              fetchMembers(selectedClassroom.id);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messageChannel);
        supabase.removeChannel(memberChannel);
      };
    }
  }, [selectedClassroom, supabase, fetchMessages, fetchMembers]);

  const handleCreateClassroom = useCallback(async () => {
    if (!user || !newClassroomName.trim()) {
      toast({
        title: "Validation Error",
        description: "Classroom name cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingClassroom(true);
    try {
      let inviteCode = null;
      if (!newClassroomIsPublic) {
        inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase(); // Longer code for better uniqueness
      }

      const { data: newClassroom, error: classroomError } = await supabase
        .from('classrooms')
        .insert({
          name: newClassroomName.trim(),
          description: newClassroomDescription.trim() || null,
          is_public: newClassroomIsPublic,
          host_id: user.id,
          invite_code: inviteCode,
        })
        .select()
        .single();

      if (classroomError) throw classroomError;

      const { error: memberError } = await supabase
        .from('classroom_members')
        .insert({
          user_id: user.id,
          classroom_id: newClassroom.id,
          role: 'host',
        });

      if (memberError) throw memberError;

      toast({
        title: "Success!",
        description: `Classroom "${newClassroom.name}" created successfully.`,
      });

      if (!newClassroomIsPublic && newClassroom.invite_code) {
        // Construct the full invite link
        const fullInviteLink = `${appDomain}/classrooms?code=${newClassroom.invite_code}`;
        setGeneratedInviteLink(fullInviteLink); // Set the generated link for display
      }

      setShowCreateClassroomModal(false);
      setNewClassroomName('');
      setNewClassroomDescription('');
      setNewClassroomIsPublic(true);
      fetchClassrooms();
    } catch (error: any) {
      console.error('Error creating classroom:', error.message);
      toast({
        title: "Error",
        description: `Failed to create classroom: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsCreatingClassroom(false);
    }
  }, [
    user,
    newClassroomName,
    newClassroomDescription,
    newClassroomIsPublic,
    supabase,
    toast,
    setGeneratedInviteLink, // Updated state setter
    setShowCreateClassroomModal,
    setNewClassroomName,
    setNewClassroomDescription,
    setNewClassroomIsPublic,
    fetchClassrooms,
    setIsCreatingClassroom,
    appDomain // Add appDomain to dependencies
  ]);

  // handleJoinClassroom is now only for public joins from the discover section
  // Private joins are handled by handleInviteLinkJoin via URL parameter
  const handleJoinClassroom = useCallback(async (classroomId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to join a classroom.",
        variant: "destructive",
      });
      return;
    }

    setIsJoiningClassroom(true);
    try {
      // Fetch the classroom to ensure it's public before joining
      const { data: classroomToJoin, error: classroomFetchError } = await supabase
        .from('classrooms')
        .select('id, name, host_id, is_public')
        .eq('id', classroomId)
        .eq('is_public', true) // Ensure it's a public classroom
        .maybeSingle();

      if (classroomFetchError) throw classroomFetchError;

      if (!classroomToJoin) {
        toast({
          title: "Error",
          description: "Public classroom not found or not accessible.",
          variant: "destructive",
        });
        return;
      }

      // Check if user is already a member
      const { data: existingMember, error: memberCheckError } = await supabase
        .from('classroom_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('classroom_id', classroomToJoin.id)
        .maybeSingle();

      if (memberCheckError) throw memberCheckError;

      if (existingMember) {
        toast({
          title: "Already a Member",
          description: `You are already a member of "${classroomToJoin.name}".`,
          variant: "default",
        });
        const { data: hostProfile, error: hostProfileError } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', classroomToJoin.host_id)
          .maybeSingle();
        if (hostProfileError) console.error('Error fetching host profile after join:', hostProfileError.message);
        setSelectedClassroom({ ...classroomToJoin, host_name: hostProfile?.full_name || 'Unknown' });
        setCurrentView('chat');
        return;
      }

      // Add user as a member
      const { error: joinError } = await supabase
        .from('classroom_members')
        .insert({
          user_id: user.id,
          classroom_id: classroomToJoin.id,
          role: 'member',
        });

      if (joinError) throw joinError;

      toast({
        title: "Success!",
        description: `Successfully joined "${classroomToJoin.name}".`,
      });
      fetchClassrooms(); // Refresh classroom list

      const { data: hostProfile, error: hostProfileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', classroomToJoin.host_id)
        .maybeSingle();

      if (hostProfileError) console.error('Error fetching host profile after join:', hostProfileError.message);

      setSelectedClassroom({ ...classroomToJoin, host_name: hostProfile?.full_name || 'Unknown' });
      setCurrentView('chat');
    } catch (error: any) {
      console.error('Error joining public classroom:', error.message);
      toast({
        title: "Error",
        description: `Failed to join classroom: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsJoiningClassroom(false);
    }
  }, [
    user,
    supabase,
    toast,
    fetchClassrooms,
    setSelectedClassroom,
    setCurrentView,
    setIsJoiningClassroom
  ]);

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedClassroom || !newMessageContent.trim()) return;

    setIsSendingMessage(true);
    try {
      const { error } = await supabase.from('classroom_messages').insert({
        classroom_id: selectedClassroom.id,
        user_id: user.id,
        content: newMessageContent.trim(),
      });

      if (error) throw error;

      setNewMessageContent('');
    } catch (error: any) {
      console.error('Error sending message:', error.message);
      toast({
        title: "Error",
        description: `Failed to send message: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSendingMessage(false);
    }
  }, [user, selectedClassroom, newMessageContent, supabase, toast, setNewMessageContent, setIsSendingMessage]);

  const handleCopyInviteLink = useCallback((link: string) => { // Updated to copy link
    if (link) {
      navigator.clipboard.writeText(link)
        .then(() => {
          toast({
            title: "Copied!",
            description: "Invite link copied to clipboard.",
          });
          setGeneratedInviteLink(null); // Hide the link after copying
        })
        .catch(err => {
          console.error('Failed to copy text: ', err);
          toast({
            title: "Error",
            description: "Failed to copy invite link.",
            variant: "destructive",
          });
        });
    }
  }, [toast, setGeneratedInviteLink]);

  if (!user) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10 p-4 text-center">
        <Seo
          title="Classroom"
          description="Join interactive virtual classrooms on Medmacs App for live lectures, doubt clearing, and collaborative study sessions."
          canonical="https://medmacs.app/classroom"
        />
        <Card className="w-full max-w-md bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-purple-200 dark:border-purple-800 shadow-lg p-6">
          <CardHeader className="mb-4">
            <Lock className="w-16 h-16 mx-auto text-purple-600 dark:text-purple-400 mb-4" />
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Access Restricted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Please log in to access the Classrooms.
            </p>
            <Button asChild className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-[1.01]">
              <Link to="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10">
    <header className="absolute top-0 left-0 right-0 z-50 bg-white/30 dark:bg-gray-900/30 
    backdrop-blur-md border-b border-purple-200/50 dark:border-purple-800/50 
    pt-[env(safe-area-inset-top)]">  
    
            <div className="container mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4 flex justify-between items-center max-w-full">
          <Link to="/dashboard" className="flex items-center space-x-1 sm:space-x-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
          </Link>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Medistics Logo" className="w-6 h-6 sm:w-8 sm:h-8 object-contain" />
            <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white hidden sm:inline">Classrooms</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white sm:hidden">Classrooms</span>
          </div>

          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
            {/* NEW: Replaced hardcoded avatar with ProfileDropdown */}
            <ProfileDropdown />
          </div>
        </div>
      </header>

            <ElasticWrapper>

      <div className="container mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 max-w-full">
        {currentView === 'list' ? (
          <GroupsDisplay
            myClassrooms={myClassrooms}
            discoverClassrooms={discoverClassrooms}
            user={user}
            fetchClassrooms={fetchClassrooms}
            setSelectedClassroom={setSelectedClassroom}
            setCurrentView={setCurrentView}
            showCreateClassroomModal={showCreateClassroomModal}
            setShowCreateClassroomModal={setShowCreateClassroomModal}
            // Removed showJoinClassroomModal, setShowJoinClassroomModal, joinInviteCode, setJoinInviteCode
            newClassroomName={newClassroomName}
            setNewClassroomName={setNewClassroomName}
            newClassroomDescription={newClassroomDescription}
            setNewClassroomDescription={setNewClassroomDescription}
            newClassroomIsPublic={newClassroomIsPublic}
            setNewClassroomIsPublic={setNewClassroomIsPublic}
            isCreatingClassroom={isCreatingClassroom}
            setIsCreatingClassroom={setIsCreatingClassroom}
            isJoiningClassroom={isJoiningClassroom} // Keep for public join status
            setIsJoiningClassroom={setIsJoiningClassroom} // Keep for public join status
            generatedInviteLink={generatedInviteLink} // New prop
            setGeneratedInviteLink={setGeneratedInviteLink} // New prop
            handleCreateClassroom={handleCreateClassroom}
            handleJoinClassroom={handleJoinClassroom} // This is now only for public classrooms
            handleCopyInviteLink={handleCopyInviteLink} // New prop to copy link
            toast={toast}
          />
        ) : (
          selectedClassroom && (
            <MessageScreen
              selectedClassroom={selectedClassroom}
              user={user}
              messages={messages}
              members={members}
              newMessageContent={newMessageContent}
              setNewMessageContent={setNewMessageContent}
              handleSendMessage={handleSendMessage}
              isSendingMessage={isSendingMessage}
              setCurrentView={setCurrentView}
              messagesEndRef={messagesEndRef}
              fetchMembers={fetchMembers}
            />
          )
        )}
      </div>
      </ElasticWrapper>
    </div>
  );
};

export default Classroom;