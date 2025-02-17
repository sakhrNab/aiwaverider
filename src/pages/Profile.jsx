// src/components/ProfilePage.jsx

import React, { useState, useEffect, useRef, useContext } from 'react';
import styles from '../styles/ProfilePage.module.css';
import { 
  getProfile, 
  updateProfile, 
  updateInterests, 
  getCommunityInfo, 
  uploadProfileImage 
} from '../utils/api';
import { AuthContext } from '../contexts/AuthContext';

const INTEREST_CATEGORIES = [
  'Quantum Computing',
  'AI',
  'Text to Image',
  'Image to Video',
  'Text to Video',
  'Text to Sound',
  'Text to Song',
  'Speech to Song',
  'Editing Tools',
  'VR',
  'Health',
  'Finance',
  'Automation',
  'VR and AG'
];

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
    interests: '',
    notifications: { email: true, inApp: true },
  });
  const [imageFile, setImageFile] = useState(null); // State for file input
  const [previewImage, setPreviewImage] = useState(''); // For image preview
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false); // State for modal
  const { user, setUserData } = useContext(AuthContext); // Get setUserData from context

  // useRef to reference the hidden file input
  const fileInputRef = useRef(null);

  // Helper function to set profile and formData from a given user object
  const updateProfileState = (userObj) => {
    setProfile(userObj);
    setFormData({
      displayName: userObj.displayName || '',
      firstName: userObj.firstName || '',
      lastName: userObj.lastName || '',
      username: userObj.username || '',
      bio: userObj.bio || '',
      interests: userObj.interests ? userObj.interests.join(', ') : '',
      notifications: userObj.notifications || { email: true, inApp: true },
    });
  };

  // Fetch profile and community info on mount.
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        // Use cached data from AuthContext if available
        if (user) {
          updateProfileState(user);
          setLoading(false);
          return; // Exit early if cached data is used
        }

        const data = await getProfile();
        console.log("Sakhr: ", data.photoURL);
        updateProfileState(data);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Error fetching profile');
      } finally {
        setLoading(false);
      }
    };

    const fetchCommunity = async () => {
      try {
        // Use cached data from AuthContext if available
        if (user) {
          updateProfileState(user);
          setLoading(false);
          return; // Exit early if cached data is used
        }
        const commData = await getCommunityInfo();
        setCommunityInfo(commData);
      } catch (err) {
        console.error('Error fetching community info:', err);
      }
    };

    fetchProfile();
    fetchCommunity();
  }, []);

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
        setUserData(updatedProfile); // Sync AuthContext
        localStorage.setItem(`profileData_${user.uid}`, JSON.stringify(updatedProfile));
      }
    } catch (err) {
      console.error(err);
      setError("Failed to update profile image.");
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
      setUserData(updatedProfile); // Sync AuthContext
      localStorage.setItem(`profileData_${user.uid}`, JSON.stringify(updatedProfile));
      setSuccess("Avatar removed successfully!");
    } catch (err) {
      console.error(err);
      setError("Failed to remove avatar.");
    }
  };

  // Handle profile update (including avatar update if a new file is selected)
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      let updatedPhotoURL = profile.photoURL;
      if (imageFile) {
        const uploadResponse = await uploadProfileImage(imageFile);
        updatedPhotoURL = uploadResponse.photoURL;
      }
      const updatedData = {
        ...formData,
        interests: formData.interests.split(',').map(item => item.trim()),
        photoURL: updatedPhotoURL,
      };
      // Update general profile info
      await updateProfile({ ...profile, displayName: updatedData.displayName, bio: updatedData.bio, photoURL: updatedPhotoURL });
      if (activeTab === 'interests') {
        await updateInterests(updatedData.interests);
      }
      const updatedProfile = await getProfile();
      setProfile(updatedProfile);
      setUserData(updatedProfile);
      localStorage.setItem(`profileData_${user.uid}`, JSON.stringify(updatedProfile)); // Update cache
      setSuccess('Profile updated successfully!');
      setEditMode(false);
      setImageFile(null);
      setPreviewImage('');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error updating profile');
    }
  };

  // When user clicks on the image (if uploaded), open the modal
  const handleImageClick = () => {
    if (profile && (profile.photoURL || previewImage)) {
      setShowModal(true);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading profile...</div>;
  }
  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.profilePage}>
      {/* Header with cover image, avatar, and basic info */}
      <header className={styles.profileHeader}>
        <div className={styles.coverImage}></div>
        <div className={`${styles.avatarContainer} ${profile.photoURL ? 'hasImage' : ''}`}>
          <img
            className={styles.avatar}
            src={previewImage || profile.photoURL || '/default-avatar.png'}
            alt="Avatar"
            onClick={handleImageClick}
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
        ) : profile.photoURL && (
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
          <h1 className={styles.displayName}>{profile.displayName}</h1>
          <p className={styles.username}>@{profile.username}</p>
          <p className={styles.bio}>{profile.bio || 'No bio provided.'}</p>
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
                    name="interests"
                        value={category}
                        checked={formData.interests.includes(category)}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            interests: e.target.checked
                              ? [...prev.interests.split(',').filter(i => i), value].join(',')
                              : prev.interests.split(',').filter(i => i !== value).join(',')
                          }));
                        }}
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
