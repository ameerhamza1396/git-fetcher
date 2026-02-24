import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/components/ui/use-toast'; // Assuming you have a toast system
import { ArrowLeft, Moon, Sun, Upload, User, Mail, Phone, Briefcase, Lightbulb, FileImage, CreditCard, Loader2, RefreshCw } from 'lucide-react'; // Added RefreshCw for CAPTCHA refresh
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ElasticWrapper } from '@/components/ElasticWrapper'
import { ProfileDropdown } from '@/components/ProfileDropdown'; // NEW: Import ProfileDropdown
import Seo from '@/components/Seo'; // Import the Seo component
import PlanBadge from '@/components/PlanBadge';


// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'dsrzawwej';
const CLOUDINARY_UPLOAD_PRESET = 'internship_applications';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// Constants for file validation
const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const InternshipApplication = () => {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [gender, setGender] = useState('');
  const [skillExperience, setSkillExperience] = useState('');
  const [whyJoinMedistics, setWhyJoinMedistics] = useState('');
  const [userSkills, setUserSkills] = useState('');
  const [skillsToApply, setSkillsToApply] = useState<string[]>([]);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [cnicStudentCardFile, setCnicStudentCardFile] = useState<File | null>(null);

  // Local CAPTCHA states
  const [captchaValue, setCaptchaValue] = useState('');
  const [userCaptchaInput, setUserCaptchaInput] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profilePictureUploading, setProfilePictureUploading] = useState(false);
  const [cnicStudentCardUploading, setCnicStudentCardUploading] = useState(false);

  // Function to generate a random CAPTCHA string
  const generateCaptcha = () => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaValue(result);
    setUserCaptchaInput(''); // Clear user input on refresh
  };

  // Prefill name and email from logged-in user and generate CAPTCHA on mount if not logged in
  useEffect(() => {
    if (user) {
      setName(user.user_metadata?.full_name || user.email?.split('@')[0] || '');
      setEmail(user.email || '');
    } else {
      generateCaptcha(); // Generate CAPTCHA if user is not logged in
    }
  }, [user]);


  // Get user profile data for the badge (same as MCQs.tsx)
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id
  });
  // File validation helper function
  const validateFile = (file: File | null, fieldName: string): boolean => {
    if (!file) {
      toast({
        title: "File Missing",
        description: `Please upload a ${fieldName}.`,
        variant: "destructive",
      });
      return false;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({
        title: "File Too Large",
        description: `${fieldName} must be less than ${MAX_FILE_SIZE_MB}MB.`,
        variant: "destructive",
      });
      return false;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: `Please upload a valid image file for ${fieldName} (JPEG, PNG, GIF, WEBP).`,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  // Handle file uploads to Cloudinary
  const uploadFileToCloudinary = async (file: File, fileType: 'profile_picture' | 'cnic_student_card') => {
    // Validation is now done in handleChange functions, but a final check here is good
    if (!file || !validateFile(file, fileType.replace(/_/g, ' '))) {
      return null;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      if (fileType === 'profile_picture') setProfilePictureUploading(true);
      else setCnicStudentCardUploading(true);

      const response = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (response.ok && data.secure_url) {
        return data.secure_url;
      } else {
        throw new Error(data.error?.message || 'Cloudinary upload failed');
      }
    } catch (error) {
      console.error(`Error uploading ${fileType} to Cloudinary:`, error);
      toast({
        title: "Upload Error",
        description: `Failed to upload ${fileType.replace(/_/g, ' ')}. Please try again.`,
        variant: "destructive",
      });
      return null;
    } finally {
      if (fileType === 'profile_picture') setProfilePictureUploading(false);
      else setCnicStudentCardUploading(false);
    }
  };

  // Handle checkbox changes for skills to apply
  const handleSkillsToApplyChange = (skill: string, checked: boolean) => {
    setSkillsToApply(prev =>
      checked ? [...prev, skill] : prev.filter(s => s !== skill)
    );
  };

  // Handle file input change with validation
  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file && validateFile(file, 'Profile Picture')) {
      setProfilePictureFile(file);
    } else {
      setProfilePictureFile(null); // Clear selected file if invalid
      e.target.value = ''; // Clear the input field
    }
  };

  const handleCnicStudentCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file && validateFile(file, 'CNIC/Student Card')) {
      setCnicStudentCardFile(file);
    } else {
      setCnicStudentCardFile(null); // Clear selected file if invalid
      e.target.value = ''; // Clear the input field
    }
  };


  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Basic validation (removed userSkills from this check)
    if (!name || !email || !contactNumber || !gender || !skillExperience || !whyJoinMedistics || skillsToApply.length === 0 || !profilePictureFile || !cnicStudentCardFile) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and upload both pictures.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // CAPTCHA validation for non-logged-in users
    if (!user) {
      if (userCaptchaInput.toLowerCase() !== captchaValue.toLowerCase()) {
        toast({
          title: "CAPTCHA Mismatch",
          description: "The CAPTCHA you entered is incorrect. Please try again.",
          variant: "destructive",
        });
        generateCaptcha(); // Generate new CAPTCHA on failure
        setIsSubmitting(false);
        return;
      }
    }

    // Re-validate files just before submission to be safe
    if (!validateFile(profilePictureFile, 'Profile Picture') || !validateFile(cnicStudentCardFile, 'CNIC/Student Card')) {
      setIsSubmitting(false);
      return;
    }

    if (skillExperience.length < 70 || skillExperience.length > 500) {
      toast({
        title: "Validation Error",
        description: "Skill & Experience must be between 70 and 500 characters.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    if (whyJoinMedistics.length < 70 || whyJoinMedistics.length > 500) {
      toast({
        title: "Validation Error",
        description: "Why join Medmacs? must be between 70 and 500 characters.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // New validation for userSkills (optional but with max length)
    if (userSkills.length > 500) {
      toast({
        title: "Validation Error",
        description: "Other Relevant Skills must be maximum 500 characters.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      // Upload files to Cloudinary
      const profilePicUrl = await uploadFileToCloudinary(profilePictureFile, 'profile_picture');
      const cnicStudentUrl = await uploadFileToCloudinary(cnicStudentCardFile, 'cnic_student_card');

      if (!profilePicUrl || !cnicStudentUrl) {
        setIsSubmitting(false);
        return; // Stop if any upload fails (error toast already shown by uploadFileToCloudinary)
      }

      // Insert data into Supabase
      const { data, error } = await supabase
        .from('internship_applications')
        .insert({
          user_id: user?.id,
          name,
          email,
          contact_number: contactNumber,
          gender,
          skill_experience: skillExperience,
          why_join_medistics: whyJoinMedistics,
          user_skills: userSkills,
          skills_to_apply: skillsToApply, // Stored as JSONB array
          profile_picture_url: profilePicUrl,
          cnic_student_card_url: cnicStudentUrl,
          application_status: 'Pending', // Default status
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Application Submitted!",
        description: "Your internship application has been successfully submitted.",
        variant: "default",
      });

      // Optionally clear form or redirect
      setName(user?.user_metadata?.full_name || user?.email?.split('@')[0] || '');
      setEmail(user?.email || '');
      setContactNumber('');
      setGender('');
      setSkillExperience('');
      setWhyJoinMedistics('');
      setUserSkills('');
      setSkillsToApply([]);
      setProfilePictureFile(null);
      setCnicStudentCardFile(null);
      // Generate new CAPTCHA after successful submission if not logged in
      if (!user) {
        generateCaptcha();
      }

    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast({
        title: "Submission Error",
        description: `Failed to submit application: ${error.message || 'Please try again.'}`,
        variant: "destructive",
      });
      // Generate new CAPTCHA on error if not logged in
      if (!user) {
        generateCaptcha();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10">
      <Seo
        title="Summer Internship 2025"
        description="Apply for the Medmacs App Summer Internship Program 2025. Gain hands-on experience in a dynamic EdTech environment."
        canonical="https://medmacs.app/summerinternship2025"
      />
      {/* Header */}
    <header className="absolute top-0 left-0 right-0 z-50 bg-white/30 dark:bg-gray-900/30 
    backdrop-blur-md border-b border-purple-200/50 dark:border-purple-800/50 
    pt-[env(safe-area-inset-top)]">  
            <div className="container mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4 flex justify-between items-center max-w-full">
          <Link to="/dashboard" className="flex items-center space-x-1 sm:space-x-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            <span className="hidden sm:inline">Back to Dashboard</span> {/* Hidden on mobile */}
          </Link>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Medistics Logo" className="w-6 h-6 sm:w-8 sm:h-8 object-contain" />
            <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white hidden sm:inline">Internship Application</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white sm:hidden">Internship</span>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <Button variant="ghost" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="w-8 h-8 sm:w-9 sm:h-9 p-0 hover:scale-110 transition-transform duration-200">
              {theme === "dark" ? <Sun className="h-3 w-3 sm:h-4 sm:w-4" /> : <Moon className="h-3 w-3 sm:h-4 sm:w-4" />}
            </Button>
            <PlanBadge plan={profile?.plan} />
              {/* NEW: Replaced hardcoded avatar with ProfileDropdown */}
              <ProfileDropdown />
          </div>
        </div>
      </header>

            <ElasticWrapper>

      <div className="container mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 max-w-3xl">
        <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-purple-200 dark:border-purple-800 shadow-lg mt-[calc(55px+env(safe-area-inset-top))] overscroll-y-contain">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Apply for Internship
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Fill out the form below to submit your application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div>
                <Label htmlFor="name" className="flex items-center gap-2 mb-2 text-gray-700 dark:text-gray-300">
                  <User className="w-4 h-4" /> Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Full Name"
                  required
                  className="rounded-md border border-purple-300 dark:border-purple-700 focus:ring-purple-500 focus:border-purple-500"
                  disabled={!!user?.user_metadata?.full_name} // Disable if prefilled
                />
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email" className="flex items-center gap-2 mb-2 text-gray-700 dark:text-gray-300">
                  <Mail className="w-4 h-4" /> Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  className="rounded-md border border-purple-300 dark:border-purple-700 focus:ring-purple-500 focus:border-purple-500"
                  disabled={!!user?.email} // Disable if prefilled
                />
              </div>

              {/* Contact Number */}
              <div>
                <Label htmlFor="contact_number" className="flex items-center gap-2 mb-2 text-gray-700 dark:text-gray-300">
                  <Phone className="w-4 h-4" /> Contact Number
                </Label>
                <Input
                  id="contact_number"
                  type="tel"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="+1234567890"
                  required
                  className="rounded-md border border-purple-300 dark:border-purple-700 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              {/* Gender */}
              <div>
                <Label className="flex items-center gap-2 mb-2 text-gray-700 dark:text-gray-300">
                  <User className="w-4 h-4" /> Gender
                </Label>
                <RadioGroup value={gender} onValueChange={setGender} required className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Male" id="gender-male" />
                    <Label htmlFor="gender-male">Male</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Female" id="gender-female" />
                    <Label htmlFor="gender-female">Female</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Other" id="gender-other" />
                    <Label htmlFor="gender-other">Other</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Skills to Apply For */}
              <div>
                <Label className="flex items-center gap-2 mb-2 text-gray-700 dark:text-gray-300">
                  <Briefcase className="w-4 h-4" /> Skills to Apply For
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {['Academics & Content', 'Tech & AI', 'Marketing & Social Media', 'Digital Content'].map(skill => (
                    <div key={skill} className="flex items-center space-x-2">
                      <Checkbox
                        id={`skill-${skill.toLowerCase().replace(/[^a-z0-9]/g, '')}`}
                        checked={skillsToApply.includes(skill)}
                        onCheckedChange={(checked) => handleSkillsToApplyChange(skill, checked as boolean)}
                      />
                      <Label htmlFor={`skill-${skill.toLowerCase().replace(/[^a-z0-9]/g, '')}`}>{skill}</Label>
                    </div>
                  ))}
                </div>
                {skillsToApply.length === 0 && (
                  <p className="text-red-500 text-sm mt-1">Please select at least one skill.</p>
                )}
              </div>

              {/* Why do you want to join Medistics as an Intern? */}
              <div>
                <Label htmlFor="why_join_medistics" className="flex items-center gap-2 mb-2 text-gray-700 dark:text-gray-300">
                  <Lightbulb className="w-4 h-4" /> Why do you want to join Medmacs as an Intern?
                </Label>
                <Textarea
                  id="why_join_medistics"
                  value={whyJoinMedistics}
                  onChange={(e) => setWhyJoinMedistics(e.target.value)}
                  placeholder="Minimum 70 characters, maximum 500 characters."
                  rows={5}
                  minLength={70}
                  maxLength={500}
                  required
                  className="rounded-md border border-purple-300 dark:border-purple-700 focus:ring-purple-500 focus:border-purple-500"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {whyJoinMedistics.length} / 500 characters (Min: 70)
                </p>
                {whyJoinMedistics.length > 0 && (whyJoinMedistics.length < 70 || whyJoinMedistics.length > 500) && (
                  <p className="text-red-500 text-sm">Please enter between 70 and 500 characters.</p>
                )}
              </div>

              {/* Tell us about your relevant skills and experience. */}
              <div>
                <Label htmlFor="skill_experience" className="flex items-center gap-2 mb-2 text-gray-700 dark:text-gray-300">
                  <Briefcase className="w-4 h-4" /> Tell us about your relevant skills and experience.
                </Label>
                <Textarea
                  id="skill_experience"
                  value={skillExperience}
                  onChange={(e) => setSkillExperience(e.target.value)}
                  placeholder="Minimum 70 characters, maximum 500 characters."
                  rows={5}
                  minLength={70}
                  maxLength={500}
                  required
                  className="rounded-md border border-purple-300 dark:border-purple-700 focus:ring-purple-500 focus:border-purple-500"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {skillExperience.length} / 500 characters (Min: 70)
                </p>
                {skillExperience.length > 0 && (skillExperience.length < 70 || skillExperience.length > 500) && (
                  <p className="text-red-500 text-sm">Please enter between 70 and 500 characters.</p>
                )}
              </div>

              {/* User Skills (General) */}
              <div>
                <Label htmlFor="user_skills" className="flex items-center gap-2 mb-2 text-gray-700 dark:text-gray-300">
                  <Lightbulb className="w-4 h-4" /> Other Relevant Skills (Optional, Max: 500 characters)
                </Label>
                <Textarea
                  id="user_skills"
                  value={userSkills}
                  onChange={(e) => setUserSkills(e.target.value)}
                  placeholder="List any other skills you possess that might be relevant."
                  rows={3}
                  maxLength={500} // Added maxLength
                  className="rounded-md border border-purple-300 dark:border-purple-700 focus:ring-purple-500 focus:border-purple-500"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {userSkills.length} / 500 characters
                </p>
                {userSkills.length > 500 && (
                  <p className="text-red-500 text-sm">Please enter maximum 500 characters.</p>
                )}
              </div>

              {/* Profile Picture Upload */}
              <div>
                <Label htmlFor="profile_picture" className="flex items-center gap-2 mb-2 text-gray-700 dark:text-gray-300">
                  <FileImage className="w-4 h-4" /> Profile Picture
                </Label>
                <Input
                  id="profile_picture"
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange} // Use the new handler
                  required
                  className="block w-full text-sm text-gray-900 dark:text-gray-100
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-purple-50 file:text-purple-700
                    hover:file:bg-purple-100
                    py-2 min-h-[44px] cursor-pointer" /* Added py-2 and min-h-[44px] for height */
                />
                {profilePictureFile && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Selected: {profilePictureFile.name}</p>}
                {profilePictureUploading && <p className="text-sm text-purple-600 dark:text-purple-400 mt-1 flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading profile picture...</p>}
              </div>

              {/* CNIC/Student Card Upload */}
              <div>
                <Label htmlFor="cnic_student_card" className="flex items-center gap-2 mb-2 text-gray-700 dark:text-gray-300">
                  <CreditCard className="w-4 h-4" /> CNIC / Student Card Picture
                </Label>
                <Input
                  id="cnic_student_card"
                  type="file"
                  accept="image/*"
                  onChange={handleCnicStudentCardChange} // Use the new handler
                  required
                  className="block w-full text-sm text-gray-900 dark:text-gray-100
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-purple-50 file:text-purple-700
                    hover:file:bg-purple-100
                    py-2 min-h-[44px] cursor-pointer" /* Added py-2 and min-h-[44px] for height */
                />
                {cnicStudentCardFile && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Selected: {cnicStudentCardFile.name}</p>}
                {cnicStudentCardUploading && <p className="text-sm text-purple-600 dark:text-purple-400 mt-1 flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading CNIC/Student Card...</p>}
              </div>

              {/* Local CAPTCHA for non-logged-in users */}
              {!user && (
                <div className="flex flex-col items-center justify-center py-4 border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Please verify you are not a robot:</p>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="text-2xl font-bold tracking-widest text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900 px-4 py-2 rounded-md select-none border border-purple-300 dark:border-purple-700">
                      {captchaValue}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={generateCaptcha}
                      className="w-9 h-9 rounded-full text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-800 border-purple-300 dark:border-purple-700"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                  <Input
                    type="text"
                    value={userCaptchaInput}
                    onChange={(e) => setUserCaptchaInput(e.target.value)}
                    placeholder="Enter CAPTCHA"
                    className="w-full max-w-xs text-center rounded-md border border-purple-300 dark:border-purple-700 focus:ring-purple-500 focus:border-purple-500"
                  />
                  {userCaptchaInput.length > 0 && userCaptchaInput.toLowerCase() !== captchaValue.toLowerCase() && (
                    <p className="text-red-500 text-sm mt-2">Incorrect CAPTCHA. Please try again.</p>
                  )}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-[1.01]"
                disabled={isSubmitting || profilePictureUploading || cnicStudentCardUploading || (!user && userCaptchaInput.toLowerCase() !== captchaValue.toLowerCase())}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5 mr-2" />
                )}
                {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-t border-purple-200 dark:border-purple-800 py-4 mt-8">
        <div className="container mx-auto px-3 sm:px-4 lg:px-8 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>A Project by Hmacs Studios.</p>
          <p>© 2025 Medmacs. All rights reserved.</p>
        </div>
      </footer>
      </ElasticWrapper>
    </div>
  );
};

export default InternshipApplication;
