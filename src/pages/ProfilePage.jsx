// src/components/ProfilePage.jsx

import React, { useState, useEffect, useRef, useContext } from 'react';
import { toast } from 'react-toastify';
import styles from './ProfilePage.module.css';
import { 
  getProfile, 
  updateProfile, 
  updateInterests, 
  getCommunityInfo, 
  uploadProfileImage,
  updateEmailPreferences
} from '../api/user/profileApi';
import { AuthContext } from '../contexts/AuthContext';
import { INTEREST_CATEGORIES } from '../constants/categories';
// import { handleGoogleProfileImage } from '../utils/imageUtils';

// Cache keys
const PROFILE_CACHE_KEY = 'profile_data';
const COMMUNITY_CACHE_KEY = 'community_data';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' }
];

const ProfilePage = () => {
  // Local state for profile data and UI
  const [profile, setProfile] = useState(null);
  const [communityInfo, setCommunityInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('about');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    firstName: '',
    lastName: '',
    username: '',
    bio: '',
    interests: [],
    notifications: { email: true, inApp: true },
    emailPreferences: {
      weeklyUpdates: true,
      newAgents: true,
      newTools: true,
      announcements: true,
      marketingEmails: true
    }
  });
  const [imageFile, setImageFile] = useState(null); // State for file input
  const [previewImage, setPreviewImage] = useState(''); // For image preview
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false); // State for modal
  const { user, updateUserProfile } = useContext(AuthContext); // Use updateUserProfile instead of setUserData

  // useRef to reference the hidden file input
  const fileInputRef = useRef(null);

  // Helper function to set profile and formData from a given user object
  const updateProfileState = (userObj) => {
    if (!userObj) return;
    
    console.log('[Profile] Updating profile state with:', userObj);
    
    // Update profile state
    setProfile(userObj);
    setFormData({
      displayName: userObj.displayName || '',
      firstName: userObj.firstName || '',
      lastName: userObj.lastName || '',
      username: userObj.username || '',
      bio: userObj.bio || '',
      interests: userObj.interests || [],
      notifications: userObj.notifications || { email: true, inApp: true },
      emailPreferences: userObj.emailPreferences || {
        weeklyUpdates: true,
        newAgents: true,
        newTools: true,
        announcements: true,
        marketingEmails: true
      }
    });
  };

  // Fetch profile and community info on mount.
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        
        // Check if we already have profile data in state
        if (profile && Object.keys(profile).length > 0) {
          console.log('[Profile] Using existing profile state data');
          setLoading(false);
          return;
        }
        
        // Use cached data from AuthContext if available
        if (user && Object.keys(user).length > 0) {
          console.log('[Profile] Using user data from AuthContext');
          updateProfileState(user);
          setLoading(false);
        }

        // Check for cached profile data
        const cachedProfile = localStorage.getItem(PROFILE_CACHE_KEY);
        if (cachedProfile) {
          try {
            const { data, timestamp } = JSON.parse(cachedProfile);
            if (Date.now() - timestamp < CACHE_DURATION) {
              console.log('[Profile] Using cached profile data');
              updateProfileState(data);
              setLoading(false);
              return;
            } else {
              console.log('[Profile] Cache expired, fetching fresh data');
            }
          } catch (cacheError) {
            console.error('[Profile] Error parsing cached profile data:', cacheError);
          }
        }

        console.log('[Profile] Fetching profile data from API');
        const data = await getProfile();
        updateProfileState(data);
        
        // Cache the fresh data
        try {
          localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
            data,
            timestamp: Date.now()
          }));
        } catch (cacheError) {
          console.error('[Profile] Error caching profile data:', cacheError);
        }
      } catch (err) {
        console.error('[Profile] Error fetching profile:', err);
        
        // Try to use cached data as fallback
        try {
          const cachedProfile = localStorage.getItem(PROFILE_CACHE_KEY);
          if (cachedProfile) {
            const { data } = JSON.parse(cachedProfile);
            console.log('[Profile] Using expired cache as fallback');
            updateProfileState(data);
          }
        } catch (fallbackError) {
          console.error('[Profile] Error reading fallback cache:', fallbackError);
          setError(err.message || 'Error fetching profile');
        }
      } finally {
        setLoading(false);
      }
    };

    const fetchCommunity = async () => {
      try {
        // Check if we already have community data in state
        if (communityInfo && Object.keys(communityInfo).length > 0) {
          console.log('[Profile] Using existing community state data');
          return;
        }
        
        // Check for cached community data
        const cachedCommunity = localStorage.getItem(COMMUNITY_CACHE_KEY);
        if (cachedCommunity) {
          try {
            const { data, timestamp } = JSON.parse(cachedCommunity);
            if (Date.now() - timestamp < CACHE_DURATION) {
              console.log('[Profile] Using cached community data');
              setCommunityInfo(data);
              return;
            } else {
              console.log('[Profile] Community cache expired, fetching fresh data');
            }
          } catch (cacheError) {
            console.error('[Profile] Error parsing cached community data:', cacheError);
          }
        }

        console.log('[Profile] Fetching community data from API');
        const commData = await getCommunityInfo();
        setCommunityInfo(commData);
        
        // Cache the fresh data
        try {
          localStorage.setItem(COMMUNITY_CACHE_KEY, JSON.stringify({
            data: commData,
            timestamp: Date.now()
          }));
        } catch (cacheError) {
          console.error('[Profile] Error caching community data:', cacheError);
        }
      } catch (err) {
        console.error('[Profile] Error fetching community info:', err);
        
        // Try to use cached data as fallback
        try {
          const cachedCommunity = localStorage.getItem(COMMUNITY_CACHE_KEY);
          if (cachedCommunity) {
            const { data } = JSON.parse(cachedCommunity);
            console.log('[Profile] Using expired community cache as fallback');
            setCommunityInfo(data);
          }
        } catch (fallbackError) {
          console.error('[Profile] Error reading fallback community cache:', fallbackError);
        }
      }
    };

    fetchProfile();
    fetchCommunity();
  }, [user]); // Only re-run when user changes

  // Handle tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setEditMode(false);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle file input change for avatar upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      // Preview image via FileReader if needed
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Trigger the hidden file input when overlay icon is clicked
  const handleAvatarUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // NEW: Confirm avatar submit function to update profile image
  const handleAvatarSubmit = async () => {
    try {
      if (imageFile) {
        const uploadResponse = await uploadProfileImage(imageFile);
        setProfile(prev => ({ ...prev, photoURL: uploadResponse.photoURL }));
        setSuccess("Profile image updated successfully!");
        setImageFile(null);
        setPreviewImage("");
        const updatedProfile = await getProfile();
        setProfile(updatedProfile);
        
        // Update user profile in AuthContext
        if (updateUserProfile) {
          await updateUserProfile(user.uid, updatedProfile);
        }
        
        // Clear cache to force refresh
        localStorage.removeItem(PROFILE_CACHE_KEY);
        
        toast.success("Profile image updated successfully!");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to update profile image.");
      toast.error("Failed to update profile image.");
    }
  };

  // NEW: Cancel the pending avatar upload
  const handleCancelUpload = () => {
    setImageFile(null);
    setPreviewImage('');
  };

  // NEW: Remove the current avatar image
  const handleRemoveImage = async () => {
    try {
      // Update profile to remove image (pass empty string or null as photoURL)
      await updateProfile({ ...profile, photoURL: '' });
      const updatedProfile = await getProfile();
      setProfile(updatedProfile);
      
      // Update user profile in AuthContext
      if (updateUserProfile) {
        await updateUserProfile(user.uid, updatedProfile);
      }
      
      // Clear cache to force refresh
      localStorage.removeItem(PROFILE_CACHE_KEY);
      
      setSuccess("Avatar removed successfully!");
      toast.success("Avatar removed successfully!");
    } catch (err) {
      console.error(err);
      setError("Failed to remove avatar.");
      toast.error("Failed to remove avatar.");
    }
  };

  // Handle checkbox change for interests
  const handleInterestChange = (category) => {
    setFormData(prev => {
      const currentInterests = [...prev.interests];
      const index = currentInterests.indexOf(category);
      
      if (index === -1) {
        // Add the category if it's not in the array
        currentInterests.push(category);
      } else {
        // Remove the category if it's already in the array
        currentInterests.splice(index, 1);
      }
      
      return {
        ...prev,
        interests: currentInterests,
      };
    });
  };

  // Handle profile update
  const handleUpdate = async (e) => {
    e.preventDefault();
    setError(''); // Clear any previous errors
    setSuccess(''); // Clear any previous success messages
    
    try {
      if (activeTab === 'interests') {
        // Get selected interests array
        const selectedInterests = formData.interests;
        
        // Validate interests array
        if (!Array.isArray(selectedInterests)) {
          throw new Error('Invalid interests format');
        }

        // Log the interests being sent
        console.log('[Profile] Selected interests for update:', selectedInterests);
        
        try {
          // Update interests
          const response = await updateInterests(selectedInterests);
          console.log('[Profile] Update interests response:', response);

          if (response.success) {
            // Clear caches
            localStorage.removeItem(PROFILE_CACHE_KEY);
            localStorage.removeItem(COMMUNITY_CACHE_KEY);
            
            // Update the profile state directly instead of fetching again
            setProfile(prev => ({
              ...prev,
              interests: selectedInterests
            }));
            
            // Update user profile in AuthContext
            if (updateUserProfile && user?.uid) {
              await updateUserProfile(user.uid, {
                ...user,
                interests: selectedInterests
              });
            }
            
            setSuccess('Interests updated successfully!');
            toast.success('Interests updated successfully!');
            setEditMode(false);
          } else {
            throw new Error('Failed to update interests');
          }
        } catch (error) {
          console.error('[Profile] Error updating interests:', error);
          setError(error.message || 'Failed to update interests');
          toast.error(error.message || 'Failed to update interests');
        }
        return;
      }

      if (activeTab === 'settings') {
        // Update email preferences if they've changed
        try {
          // Update email preferences
          await updateEmailPreferences(formData.emailPreferences);
          
          // Clear cache
          localStorage.removeItem(PROFILE_CACHE_KEY);
          
          // Update profile state directly
          setProfile(prev => ({
            ...prev,
            emailPreferences: formData.emailPreferences
          }));
          
          // Update normal notifications
          await updateProfile({
            ...profile,
            notifications: formData.notifications,
            language: formData.language
          });
          
          // Update user profile in AuthContext
          if (updateUserProfile && user?.uid) {
            await updateUserProfile(user.uid, {
              ...user,
              notifications: formData.notifications,
              emailPreferences: formData.emailPreferences,
              language: formData.language
            });
          }
          
          setSuccess('Settings updated successfully!');
          toast.success('Settings updated successfully!');
          return;
        } catch (preferencesError) {
          console.error('[Profile] Error updating email preferences:', preferencesError);
          setError(`Error updating preferences: ${preferencesError.message || 'Unknown error'}`);
          toast.error(`Error updating preferences: ${preferencesError.message || 'Unknown error'}`);
          return;
        }
      }

      // Rest of the code for other profile updates
      let updatedPhotoURL = profile.photoURL;
      if (imageFile) {
        try {
          console.log('[Profile] Uploading profile image...');
          const formData = new FormData();
          formData.append('avatar', imageFile);
          
          const uploadResponse = await uploadProfileImage(imageFile);
          console.log('[Profile] Upload response:', uploadResponse);
          
          if (uploadResponse && uploadResponse.photoURL) {
            updatedPhotoURL = uploadResponse.photoURL;
          } else {
            throw new Error('Invalid response from image upload');
          }
        } catch (uploadError) {
          console.error('[Profile] Error uploading image:', uploadError);
          setError(`Error uploading image: ${uploadError.message || 'Unknown error'}`);
          toast.error(`Error uploading image: ${uploadError.message || 'Unknown error'}`);
          return;
        }
      }

      const updatedData = {
        ...formData,
        photoURL: updatedPhotoURL,
      };

      try {
        console.log('[Profile] Updating profile with data:', { 
          ...profile, 
          displayName: updatedData.displayName, 
          bio: updatedData.bio, 
          photoURL: updatedPhotoURL 
        });
        
        await updateProfile({ 
          ...profile, 
          displayName: updatedData.displayName, 
          bio: updatedData.bio, 
          photoURL: updatedPhotoURL 
        });

        // Clear cache
        localStorage.removeItem(PROFILE_CACHE_KEY);
        
        // Update profile state directly
        setProfile(prev => ({
          ...prev,
          displayName: updatedData.displayName,
          bio: updatedData.bio,
          photoURL: updatedPhotoURL
        }));
        
        // Update user profile in AuthContext
        if (updateUserProfile && user?.uid) {
          await updateUserProfile(user.uid, {
            ...user,
            displayName: updatedData.displayName,
            bio: updatedData.bio,
            photoURL: updatedPhotoURL
          });
        }
        
        setSuccess('Profile updated successfully!');
        toast.success('Profile updated successfully!');
        setEditMode(false);
        setImageFile(null);
        setPreviewImage('');
      } catch (profileUpdateError) {
        console.error('[Profile] Error updating profile:', profileUpdateError);
        setError(`Error updating profile: ${profileUpdateError.message || 'Unknown error'}`);
        toast.error(`Error updating profile: ${profileUpdateError.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('[Profile] Error in handleUpdate:', err);
      setError(err.message || 'Error updating profile');
      toast.error(err.message || 'Error updating profile');
      // Keep edit mode active when there's an error
      setEditMode(true);
    }
  };

  // When user clicks on the image (if uploaded), open the modal
  const handleImageClick = () => {
    if (profile && (profile.photoURL || previewImage)) {
      setShowModal(true);
    }
  };

  // Clean up event listeners on unmount
  useEffect(() => {
    return () => {
      // Clean up any event listeners or subscriptions
    };
  }, []);

  if (loading) {
    return <div className={styles.loading}>Loading profile...</div>;
  }
  
  if (error && !profile) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.profilePage}>
      {/* Header with cover image, avatar, and basic info */}
      <header className={styles.profileHeader}>
        <div className={styles.coverImage}></div>
        <div className={`${styles.avatarContainer} ${profile?.photoURL ? styles.hasImage : ''}`}>
          <img
            className={styles.avatar}
            src={previewImage || (profile?.photoURL || '/default-avatar.png')}
            alt="Profile Avatar"
            onClick={handleImageClick}
            onError={(e) => {
              console.error('Image load error:', e);
              e.target.src = '/default-avatar.png';
              e.target.onerror = null;
            }}
          />
          {/* Overlay icon for uploading avatar */}
          <div className={styles.avatarOverlay} onClick={handleAvatarUploadClick}>
            <span className={styles.uploadIcon}>📷</span>
          </div>
          {/* Hidden file input */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
        
        {/* Updated image action buttons logic */}
        {previewImage ? (
          <div className={styles.imageActionButtons}>
            <button className={styles.saveAvatarButton} onClick={handleAvatarSubmit}>
              Save Profile Image
            </button>
            <button className={styles.cancelUploadButton} onClick={handleCancelUpload}>
              Cancel Upload
            </button>
          </div>
        ) : profile?.photoURL && (
          <div className={styles.imageActionButtons}>
            <button className={styles.editImageButton} onClick={handleAvatarUploadClick}>
              Change Image
            </button>
            <button className={styles.cancelUploadButton} onClick={handleRemoveImage}>
              Remove Image
            </button>
          </div>
        )}
        <div className={styles.profileInfo}>
          <h1 className={styles.displayName}>{profile?.displayName}</h1>
          <p className={styles.username}>@{profile?.username}</p>
          <p className={styles.bio}>{profile?.bio || 'No bio provided.'}</p>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className={styles.profileNav}>
        <button
          className={activeTab === 'about' ? styles.active : ''}
          onClick={() => handleTabChange('about')}
        >
          About
        </button>
        <button
          className={activeTab === 'interests' ? styles.active : ''}
          onClick={() => handleTabChange('interests')}
        >
          Interests
        </button>
        <button
          className={activeTab === 'favorites' ? styles.active : ''}
          onClick={() => handleTabChange('favorites')}
        >
          Favorites
        </button>
        <button
          className={activeTab === 'settings' ? styles.active : ''}
          onClick={() => handleTabChange('settings')}
        >
          Settings
        </button>
        <button
          className={activeTab === 'community' ? styles.active : ''}
          onClick={() => handleTabChange('community')}
        >
          Community
        </button>
      </nav>

      {/* Main Content Area */}
      <main className={styles.profileContent}>
        {activeTab === 'about' && (
          <div className={styles.tabContent}>
            {!editMode ? (
              <>
                <h2>About Me</h2>
                <p><strong>Full Name:</strong> {profile.firstName} {profile.lastName}</p>
                <p><strong>Email:</strong> {profile.email}</p>
                <p><strong>Bio:</strong> {profile.bio || 'No bio provided.'}</p>
                <button className={styles.editButton} onClick={() => setEditMode(true)}>
                  Edit Profile
                </button>
              </>
            ) : (
              <form className={styles.editForm} onSubmit={handleUpdate}>
                <h2>Edit Profile</h2>
                <label>
                  Display Name:
                  <input
                    type="text"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                  />
                </label>
                <label>
                  Bio:
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                  />
                </label>
                <div className={styles.formButtons}>
                  <button type="submit">Save</button>
                  <button type="button" onClick={() => { setEditMode(false); setImageFile(null); setPreviewImage(''); }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {activeTab === 'interests' && (
          <div className={styles.tabContent}>
            {!editMode ? (
              <>
                <h2>My Interests</h2>
                <div className={styles.interestsList}>
                  {profile.interests && profile.interests.length > 0 ? (
                    <div className={styles.interestTags}>
                      {profile.interests.map((interest, index) => (
                        <span key={index} className={styles.interestTag}>
                          {interest}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p>No interests selected yet.</p>
                  )}
                </div>
                <button className={styles.editButton} onClick={() => setEditMode(true)}>
                  Edit Interests
                </button>
              </>
            ) : (
              <form className={styles.editForm} onSubmit={handleUpdate}>
                <h2>Select Your Interests</h2>
                <div className={styles.interestsGrid}>
                  {INTEREST_CATEGORIES.map((category, index) => (
                    <label key={index} className={styles.interestCheckbox}>
                  <input
                        type="checkbox"
                        checked={formData.interests.includes(category)}
                        onChange={() => handleInterestChange(category)}
                      />
                      {category}
                </label>
                  ))}
                </div>
                <div className={styles.formButtons}>
                  <button type="submit">Save</button>
                  <button type="button" onClick={() => setEditMode(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {activeTab === 'favorites' && (
          <div className={styles.tabContent}>
            <h2>Favorites</h2>
            {profile.favorites && profile.favorites.length > 0 ? (
              <ul className={styles.favoritesList}>
                {profile.favorites.map((fav, index) => (
                  <li key={index}>{fav}</li>
                ))}
              </ul>
            ) : (
              <p>No favorites saved.</p>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className={styles.tabContent}>
            <h2>Settings</h2>
            <form className={styles.settingsForm} onSubmit={handleUpdate}>
              <div className={styles.settingSection}>
                <h3>Language</h3>
                <select
                  name="language"
                  value={formData.language || 'en'}
                  onChange={handleInputChange}
                  className={styles.languageSelect}
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.settingSection}>
                <h3>Notifications</h3>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="emailNotifications"
                    checked={formData.notifications.email}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        notifications: {
                          ...prev.notifications,
                          email: e.target.checked
                        }
                      }));
                    }}
                  />
                  Email Notifications
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="inAppNotifications"
                    checked={formData.notifications.inApp}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        notifications: {
                          ...prev.notifications,
                          inApp: e.target.checked
                        }
                      }));
                    }}
                  />
                  In-App Notifications
                </label>
              </div>

              <div className={styles.settingSection}>
                <h3>Email Updates</h3>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="weeklyUpdates"
                    checked={formData.emailPreferences?.weeklyUpdates}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        emailPreferences: {
                          ...prev.emailPreferences,
                          weeklyUpdates: e.target.checked
                        }
                      }));
                    }}
                  />
                  Receive weekly updates
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="newAgents"
                    checked={formData.emailPreferences?.newAgents}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        emailPreferences: {
                          ...prev.emailPreferences,
                          newAgents: e.target.checked
                        }
                      }));
                    }}
                  />
                  Receive notifications about new agents
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="newTools"
                    checked={formData.emailPreferences?.newTools}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        emailPreferences: {
                          ...prev.emailPreferences,
                          newTools: e.target.checked
                        }
                      }));
                    }}
                  />
                  Receive notifications about new AI tools
                </label>
                <p className={styles.preferencesNote}>These notifications are enabled by default to keep you informed about new features.</p>
              </div>

              <button type="submit" className={styles.saveButton}>
                Save Settings
              </button>
            </form>
          </div>
        )}

        {activeTab === 'community' && (
          <div className={styles.tabContent}>
            <h2>Community</h2>
            <div className={styles.communitySection}>
              <h3>Join Our Discord Community</h3>
              <p>Connect with other AI enthusiasts, share ideas, and get exclusive updates!</p>
              {communityInfo?.discordLink && (
            <a
                  href={communityInfo.discordLink}
              target="_blank"
              rel="noopener noreferrer"
                  className={styles.discordButton}
            >
              Join Discord
            </a>
              )}
            </div>

            <div className={styles.communitySection}>
              <h3>Premium Membership</h3>
              <div className={styles.benefitsList}>
                <h4>Benefits:</h4>
                <ul>
                  {communityInfo?.communityBenefits?.map((benefit, index) => (
                    <li key={index}>{benefit}</li>
                  ))}
                </ul>
              </div>
              {communityInfo?.paymentLink && (
                <a
                  href={communityInfo.paymentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.upgradeButton}
                >
                  Upgrade to Premium
                </a>
              )}
            </div>
          </div>
        )}
      </main>
      {success && <p style={{ color: 'green' }}>{success}</p>}

      {/* Modal for enlarged image */}
      {showModal && (
        <div className={styles.modal} onClick={() => setShowModal(false)}>
          <button
            className={styles.modalClose}
            onClick={(e) => { e.stopPropagation(); setShowModal(false); }}
          >
            &times;
          </button>
          <img
            className={styles.modalContent}
            src={previewImage || profile.photoURL || '/default-avatar.png'}
            alt="Enlarged Avatar"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
