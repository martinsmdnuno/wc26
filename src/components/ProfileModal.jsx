import { useState, useRef } from 'react';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../i18n/LanguageContext';
import { useModalA11y } from '../hooks/useModalA11y';
import { LEGEND_AVATARS } from '../utils/avatars';
import Avatar from './Avatar';

// Downscale to a small square JPEG before upload — keeps avatars tiny and
// dodges the Storage 2 MB rule regardless of the source photo's size.
function resizeImage(file, max = 256) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(max / img.width, max / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob'))), 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load')); };
    img.src = url;
  });
}

export default function ProfileModal({ onClose }) {
  const { user, profile, updateUserProfile } = useAuth();
  const { t } = useLanguage();
  const ref = useModalA11y({ onEscape: onClose });
  const fileInput = useRef(null);

  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [sel, setSel] = useState({
    avatarKind: profile?.avatarKind || (profile?.avatar ? 'emoji' : 'initial'),
    avatar: profile?.avatar || '',
    customPhotoURL: profile?.customPhotoURL || '',
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const pickEmoji = (emoji) => setSel((s) => ({ ...s, avatarKind: 'emoji', avatar: emoji }));
  const clearAvatar = () => setSel((s) => ({ ...s, avatarKind: 'initial', avatar: '' }));

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { setError(t('avatarErrorType')); return; }
    setError('');
    setUploading(true);
    try {
      const blob = await resizeImage(file);
      const path = `avatars/${user.uid}/avatar.jpg`;
      const sref = storageRef(storage, path);
      await uploadBytes(sref, blob, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(sref);
      setSel({ avatarKind: 'photo', avatar: '', customPhotoURL: url });
    } catch {
      setError(t('avatarErrorUpload'));
    }
    setUploading(false);
  };

  const handleSave = async () => {
    const trimNick = nickname.trim();
    if (trimNick.length < 2) { setError(t('nicknameMinLength')); return; }
    setSaving(true);
    setError('');
    try {
      await updateUserProfile({
        nickname: trimNick,
        avatarKind: sel.avatarKind,
        avatar: sel.avatarKind === 'emoji' ? sel.avatar : '',
        customPhotoURL: sel.avatarKind === 'photo' ? sel.customPhotoURL : (sel.customPhotoURL || ''),
      });
      onClose();
    } catch {
      setError(t('nicknameSaveError'));
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal profile-modal"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        <h2 className="modal__title" id="profile-modal-title">{t('editProfileTitle')}</h2>

        <div className="profile-modal__preview">
          <Avatar
            nickname={nickname}
            avatar={sel.avatar}
            customPhotoURL={sel.customPhotoURL}
            avatarKind={sel.avatarKind}
            className="profile-modal__preview-avatar"
          />
        </div>

        <label className="modal__label">
          {t('nicknameLabel')}
          <input
            className="modal__input"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
          />
        </label>

        <p className="profile-modal__section-label">{t('avatarLegendsLabel')}</p>
        <div className="profile-modal__grid" role="radiogroup" aria-label={t('avatarLegendsLabel')}>
          {LEGEND_AVATARS.map((a) => {
            const active = sel.avatarKind === 'emoji' && sel.avatar === a.emoji;
            return (
              <button
                key={a.emoji}
                type="button"
                role="radio"
                aria-checked={active}
                title={t(a.labelKey)}
                aria-label={t(a.labelKey)}
                className={`profile-modal__emoji ${active ? 'profile-modal__emoji--active' : ''}`}
                onClick={() => pickEmoji(a.emoji)}
              >
                <span aria-hidden="true">{a.emoji}</span>
              </button>
            );
          })}
        </div>

        <div className="profile-modal__actions-row">
          <button
            type="button"
            className="profile-modal__secondary"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
          >
            {uploading ? t('avatarUploading') : `📷 ${t('avatarUploadBtn')}`}
          </button>
          {sel.avatarKind !== 'initial' && (
            <button type="button" className="profile-modal__secondary" onClick={clearAvatar}>
              {t('avatarRemoveBtn')}
            </button>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            onChange={handleFile}
            style={{ display: 'none' }}
          />
        </div>

        {error && <p className="modal__error">{error}</p>}

        <div className="profile-modal__footer">
          <button type="button" className="profile-modal__cancel" onClick={onClose} disabled={saving}>
            {t('cancel')}
          </button>
          <button type="button" className="modal__btn" onClick={handleSave} disabled={saving || uploading}>
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
