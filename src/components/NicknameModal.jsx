import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../i18n/LanguageContext';

export default function NicknameModal() {
  const { saveProfile } = useAuth();
  const { t } = useLanguage();
  const [nickname, setNickname] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimNick = nickname.trim();
    const trimCode = groupCode.trim().toUpperCase();

    if (!trimNick || trimNick.length < 2) {
      setError(t('nicknameMinLength'));
      return;
    }
    if (!trimCode || trimCode.length < 3) {
      setError(t('groupCodeMinLength'));
      return;
    }

    setSaving(true);
    setError('');
    try {
      await saveProfile(trimNick, trimCode);
    } catch {
      setError(t('nicknameSaveError'));
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <form className="modal" onSubmit={handleSubmit}>
        <span className="modal__icon">⚽</span>
        <h2 className="modal__title">{t('welcomeTitle')}</h2>
        <p className="modal__subtitle">{t('welcomeSubtitle')}</p>

        <label className="modal__label">
          {t('nicknameLabel')}
          <input
            className="modal__input"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={t('nicknamePlaceholder')}
            maxLength={20}
            autoFocus
          />
        </label>

        <label className="modal__label">
          {t('groupCodeLabel')}
          <input
            className="modal__input"
            type="text"
            value={groupCode}
            onChange={(e) => setGroupCode(e.target.value)}
            placeholder={t('groupCodePlaceholder')}
            maxLength={12}
          />
          <span className="modal__hint">{t('groupCodeHint')}</span>
        </label>

        {error && <p className="modal__error">{error}</p>}

        <button className="modal__btn" type="submit" disabled={saving}>
          {saving ? t('saving') : t('joinBtn')}
        </button>
      </form>
    </div>
  );
}
