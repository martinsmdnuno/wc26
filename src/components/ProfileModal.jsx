import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../i18n/LanguageContext';
import { useModalA11y } from '../hooks/useModalA11y';
import { LEGEND_PHOTOS } from '../utils/legends';
import Avatar from './Avatar';

const legendValue = (file) => `legend:${file}`;

export default function ProfileModal({ onClose }) {
  const { profile, updateUserProfile } = useAuth();
  const { t } = useLanguage();
  const ref = useModalA11y({ onEscape: onClose });

  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [sel, setSel] = useState({
    avatarKind: profile?.avatarKind || (profile?.avatar ? 'legend' : 'initial'),
    avatar: profile?.avatar || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedLegend = LEGEND_PHOTOS.find((l) => legendValue(l.file) === sel.avatar);

  const pickLegend = (file) => setSel({ avatarKind: 'legend', avatar: legendValue(file) });
  const clearAvatar = () => setSel({ avatarKind: 'initial', avatar: '' });

  const handleSave = async () => {
    const trimNick = nickname.trim();
    if (trimNick.length < 2) { setError(t('nicknameMinLength')); return; }
    setSaving(true);
    setError('');
    try {
      await updateUserProfile({
        nickname: trimNick,
        avatarKind: sel.avatarKind,
        avatar: sel.avatar,
        customPhotoURL: '',
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
            avatarKind={sel.avatarKind}
            className="profile-modal__preview-avatar"
          />
        </div>
        {selectedLegend && (
          <p className="profile-modal__legend-caption">
            <strong>{selectedLegend.name}</strong> · {selectedLegend.tagline}
          </p>
        )}

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
          {LEGEND_PHOTOS.map((l) => {
            const active = sel.avatar === legendValue(l.file);
            return (
              <button
                key={l.file}
                type="button"
                role="radio"
                aria-checked={active}
                title={`${l.name} · ${l.tagline}`}
                aria-label={`${l.name}, ${l.tagline}`}
                className={`profile-modal__legend ${active ? 'profile-modal__legend--active' : ''}`}
                onClick={() => pickLegend(l.file)}
              >
                <Avatar avatar={legendValue(l.file)} className="profile-modal__legend-img" />
              </button>
            );
          })}
        </div>

        <div className="profile-modal__actions-row">
          {sel.avatarKind !== 'initial' && (
            <button type="button" className="profile-modal__secondary" onClick={clearAvatar}>
              {t('avatarRemoveBtn')}
            </button>
          )}
        </div>

        {error && <p className="modal__error">{error}</p>}

        <div className="profile-modal__footer">
          <button type="button" className="profile-modal__cancel" onClick={onClose} disabled={saving}>
            {t('cancel')}
          </button>
          <button type="button" className="modal__btn" onClick={handleSave} disabled={saving}>
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
