import { useState } from 'react';
import { User } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { uploadImage } from '@/services/upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { toast } from '@/utils/toast';
import { logger } from '@/utils/logger';

interface UserProfileProps {
  user: User | null;
}

export default function UserProfile({ user }: UserProfileProps) {
  const { updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [imageUrl, setImageUrl] = useState(user?.profileImage || '');
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  if (!user) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];

      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validImageTypes.includes(selectedFile.type)) {
        toast.error('Invalid file type. Please select an image file (jpeg, png, gif, webp).');
        return;
      }

      const maxSizeInBytes = 3 * 1024 * 1024;
      if (selectedFile.size > maxSizeInBytes) {
        toast.error('File size exceeds the 3MB limit. Please select a smaller file.');
        return;
      }

      setFile(selectedFile);
      setImageUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleSave = async () => {
    if (!user || !updateProfile) return;

    setIsLoading(true);

    try {
      let profileImageUrl = user.profileImage;

      if (file) {
        profileImageUrl = await uploadImage(file);
      }

      await updateProfile({
        username: username,
        bio: bio,
        profileImage: profileImageUrl
      });

      setImageUrl(profileImageUrl || '');
      setFile(null);
      setIsEditing(false);
    } catch (error) {
      logger.error('Error updating profile', error, { component: 'UserProfile' });
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Your Profile</h2>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            {isEditing
              ? 'Edit your profile information below'
              : 'View and manage your account details'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={imageUrl} />
                  <AvatarFallback className="text-2xl">
                    {getInitials(username)}
                  </AvatarFallback>
                </Avatar>

                {isEditing && (
                  <div className="mt-4">
                    <Label htmlFor="profileImage">Profile Image</Label>
                    <Input
                      id="profileImage"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="mt-1"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4 flex-1">
                <div>
                  <Label htmlFor="username">Username</Label>
                  {isEditing ? (
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 text-lg font-medium">{username}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="bio">Bio</Label>
                  {isEditing ? (
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                  ) : (
                    <p className="mt-1 text-muted-foreground">{bio || 'No bio yet'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
