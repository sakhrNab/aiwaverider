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
                <p>{profile.interests ? profile.interests.join(', ') : 'No interests set.'}</p>
                <button className={styles.editButton} onClick={() => setEditMode(true)}>
                  Edit Interests
                </button>
              </>
            ) : (
              <form className={styles.editForm} onSubmit={handleUpdate}>
                <h2>Edit Interests</h2>
                <label>
                  Interests (comma-separated):
                  <input
                    type="text"
                    name="interests"
                    value={formData.interests}
                    onChange={handleInputChange}
                  />
                </label>
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
            <p>Settings content goes here.</p>
          </div>
        )}

        {activeTab === 'community' && (
          <div className={styles.tabContent}>
            <h2>Community</h2>
            <p>Join our Discord community for exclusive updates and discussions.</p>
            <a
              href={profile.discordInvite || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.communityLink}
            >
              Join Discord
            </a>
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
