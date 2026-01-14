import { BellIcon } from '@heroicons/react/24/solid';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import useAuth from '@/hooks/useAuth';
import { auth, db } from '@/firebase';
import { collection, doc, getDocs, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile } from 'firebase/auth';
import { supabase } from '@/lib/supabase';


function Header({
    onToggleFavoritos,
    mostrarFavoritas,
}: {
    onToggleFavoritos: () => void;
    mostrarFavoritas: boolean;
}) {
    const [isScrolled, setIsScrolled] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showDropdownMenu, setShowDropdownMenu] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [displayName, setDisplayName] = useState<string>('Usuário');
    const [modalView, setModalView] = useState<'config' | 'editAccount'>('config');
    const [editName, setEditName] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [editPhoto, setEditPhoto] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string>('');

    const { logout, user, authReady } = useAuth();

    const [userData, setUserData] = useState({ name: '', email: '' });
    const [stripeData, setStripeData] = useState({
        cardBrand: '',
        cardLast4: '',
        expMonth: '',
        expYear: '',
        status: '',
        renewalDate: '',
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdownMenu(false);
            }
        };

        if (showDropdownMenu) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showDropdownMenu]);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 0);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleToggleNotification = async () => {
            const notificationModule = await import('@/components/ToggleNotification');
            notificationModule.toggleNotification();
        };

        let unsubscribeProfile: undefined | (() => void);

        const fetchUserAndSubscription = async () => {
            if (!authReady || !user) return;

            const uid = user.uid;
            const userRef = doc(db, 'users', uid);
            unsubscribeProfile = onSnapshot(userRef, (snap) => {
                const profile = snap.exists() ? snap.data() : null;
                const resolvedName = profile?.name || auth.currentUser?.displayName || user.displayName || '';
                const resolvedPhoto = profile?.photoURL || auth.currentUser?.photoURL || user.photoURL || '';

                setUserData({ name: resolvedName, email: user.email || '' });
                setEditName(resolvedName);
                setAvatarUrl(resolvedPhoto);
                setDisplayName(resolvedName || 'Usuário');
            });


            const subSnap = await getDocs(collection(db, 'customers', uid, 'subscriptions'));
            if (!subSnap.empty) {
                const subscription = subSnap.docs[0].data();

                const periodEnd = subscription.current_period_end?.seconds
                    ? subscription.current_period_end.seconds * 1000
                    : subscription.current_period_end?.toDate()?.getTime();

                const isActive = periodEnd && periodEnd > Date.now();
                const statusLabel = isActive ? 'Ativa' : 'Inativa';

                const paymentSnap = await getDocs(collection(db, 'customers', uid, 'payments'));
                const latestCharge = paymentSnap.docs[0]?.data()?.charges?.data?.[0]?.payment_method_details?.card;

                setStripeData({
                    cardBrand: latestCharge?.brand || '****',
                    cardLast4: latestCharge?.last4 || '****',
                    expMonth: latestCharge?.exp_month || '**',
                    expYear: latestCharge?.exp_year || '**',
                    status: statusLabel,
                    renewalDate: periodEnd ? new Date(periodEnd).toLocaleDateString('pt-BR') : '--/--/----',
                });
            }
        };


        fetchUserAndSubscription();

        const notiButton = document.querySelector('.noti');
        if (notiButton) notiButton.addEventListener('click', handleToggleNotification);

        return () => {
            if (notiButton) notiButton.removeEventListener('click', handleToggleNotification);
            if (unsubscribeProfile) {
                unsubscribeProfile();
            }
        };
    }, [authReady, user]);

    const withCacheBuster = (url: string) => {
        if (!url) return url;
        const joiner = url.includes('?') ? '&' : '?';
        return `${url}${joiner}t=${Date.now()}`;
    };

    const handleSaveAccount = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            setSaveError('Usuário não autenticado.');
            return;
        }

        setIsSaving(true);
        setSaveError('');

        try {
            let photoURL = currentUser.photoURL || '';

            if (editPhoto) {
                const fileExt = editPhoto.name.split('.').pop() || 'jpg';
                const filePath = `${currentUser.uid}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, editPhoto, { upsert: true, contentType: editPhoto.type });

                if (uploadError) {
                    throw new Error(uploadError.message);
                }

                const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
                if (!data?.publicUrl) {
                    throw new Error('Nao foi possivel obter a URL da foto.');
                }
                photoURL = withCacheBuster(data.publicUrl);
            }

            const nextName = editName.trim();
            const profileUpdates: { displayName?: string; photoURL?: string } = {};

            if (nextName) {
                profileUpdates.displayName = nextName;
            }
            if (photoURL) {
                profileUpdates.photoURL = photoURL;
            }

            if (Object.keys(profileUpdates).length) {
                await updateProfile(currentUser, profileUpdates);
            }

            if (editPassword.trim()) {
                if (!currentPassword.trim()) {
                    throw new Error('Informe sua senha atual para alterar a senha.');
                }

                const credential = EmailAuthProvider.credential(
                    currentUser.email || '',
                    currentPassword.trim()
                );
                await reauthenticateWithCredential(currentUser, credential);
                await updatePassword(currentUser, editPassword.trim());
            }

            await setDoc(
                doc(db, 'users', currentUser.uid),
                {
                    name: nextName || currentUser.displayName || '',
                    email: currentUser.email || '',
                    photoURL: photoURL || currentUser.photoURL || '',
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );

            setDisplayName(nextName || currentUser.displayName || 'Usuário');
            setUserData((prev) => ({ ...prev, name: nextName || prev.name }));
            setAvatarUrl(photoURL || currentUser.photoURL || '');
            setModalView('config');
        } catch (error: any) {
            console.error('Erro ao salvar configurações:', error);
            setSaveError(error?.message || 'Não foi possível salvar as alterações.');
        } finally {
            setIsSaving(false);
        }
    };



    return (
        <header className={`${isScrolled && 'bg-[#141414]'}`}>
            <div className="flex items-center space-x-2 md:space-x-[105px] px-20">
                <img src="logo.svg" width={175} height={51} className="cursor-pointer object-contain" />
                <ul className="hidden space-x-8 md:flex">
                    <li className="headerLink">Aulas</li>
                    <li className="headerLink">Treinamentos</li>
                    <li className="headerLink">Posturas</li>
                    <li className="headerLink">Alimentação</li>
                    <li className="headerLink cursor-pointer" onClick={onToggleFavoritos}>
                        {mostrarFavoritas ? "Ver Todas" : "Meus Favoritos"}
                    </li>
                </ul>
            </div>
            <div className="flex items-center space-x-6 text-sm font-light pr-20">
                <div className="search-box">
                    <button className="btn-search"><MagnifyingGlassIcon className="hidden sm:inline h-6 w-6" /></button>
                    <input type="text" className="input-search" placeholder="buscar ..." />
                </div>
                <p className="text-[16px]">{displayName}</p>
                <button className="noti">
                    <BellIcon className="h-6 w-6" />
                    <div className="blip"></div>
                </button>
                <div className="notification">
                    <i className="fas fa-times close"></i>
                    <div className="content">
                        <div className="profile-img"></div>
                        <div className="text">
                            <h1 className="font-bold">Temporadas</h1>
                            <p>Veja a nova temporada de Aulas Gravadas - Mais populares que foi adicionada em nosso catalogo</p>
                        </div>
                    </div>
                </div>
                <div ref={dropdownRef} className="relative flex items-center gap-1">
                    {/* Avatar continua abrindo o modal completo */}
                    <img
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        src={avatarUrl || 'Avatar.svg'}
                        alt="Avatar"
                        className="cursor-pointer rounded-full h-8 w-8"
                    />

                    {/* Setinha com rotação animada */}
                    <span
                        onClick={() => setShowDropdownMenu(prev => !prev)}
                        className={`cursor-pointer text-white text-sm transform transition-transform duration-200 ${showDropdownMenu ? 'rotate-180' : ''
                            }`}
                    >
                        ▼
                    </span>

                    {showUserMenu && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
                            <div className="relative bg-[#1F1F1F] text-white rounded-lg p-6 w-[90%] max-w-lg">
                                <button onClick={() => setShowUserMenu(false)} className="absolute top-4 right-4 text-white hover:text-[#DF9DC0] transition">
                                    <XMarkIcon className="h-6 w-6" />
                                </button>
                                {modalView === 'config' && (
                                    <>
                                        <h2 className="text-xl font-semibold mb-4">Configurações</h2>
                                        <div className="space-y-5 text-sm">
                                            <div className='space-y-2'>
                                                <button
                                                    onClick={() => {
                                                        setModalView('editAccount');
                                                        setShowUserMenu(true);
                                                        setShowDropdownMenu(false);
                                                        setSaveError('');
                                                        setEditPassword('');
                                                        setCurrentPassword('');
                                                    }}
                                                    className="block w-full px-4 py-3 text-left text-white hover:bg-[#DF9DC0]/30"
                                                >
                                                    Editar Conta
                                                </button>
                                                <p className="text-gray-300">Termos de Uso</p>
                                                <p className="text-gray-300">Termos de Privacidade</p>
                                            </div>
                                            <div className='space-y-2'>
                                                <h3 className="font-bold mb-1">Informações de Pagamento</h3>
                                                <p className="text-gray-300">E-mail: {userData.email}</p>
                                                <p className="text-gray-300">Número do Cartão: 💳 {stripeData.cardBrand} **** **** {stripeData.cardLast4}</p>
                                                <p className="text-gray-300">Validade: {stripeData.expMonth}/{stripeData.expYear}</p>
                                                <p className="text-gray-300">Status: {stripeData.status}</p>
                                                <p className="text-gray-300">Próxima Renovação: {stripeData.renewalDate}</p>
                                            </div>
                                            <div className='space-y-2'>
                                                <h3 className="font-bold mb-1">Sobre este aplicativo</h3>
                                                <p className="text-gray-300">HábitoFit</p>
                                                <p className="text-gray-300">Versão 1.0.0</p>
                                                <p className="text-gray-300">CNPJ: 22.230.754/0001-70</p>
                                            </div>
                                            <div>
                                                <h3 className="font-bold mb-1">ID da Conta</h3>
                                                <p className="text-gray-400 text-xs">#d41d8cd98f00b204e9800998ecf8427e</p>
                                            </div>
                                            <div>
                                                <h3 className="font-bold mb-1">Suporte</h3>
                                                <p className="text-gray-300">suporte@habitoFit.com.br</p>
                                                <p className="text-gray-300">(31) 0000-0000</p>
                                            </div>
                                            <div className="text-center pt-4 border-t border-gray-700">
                                                <img src="/logo.svg" className="mx-auto h-6" alt="Logo" />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {modalView === 'editAccount' && (
                                    <>
                                        <h2 className="text-xl font-semibold mb-4">Editar Conta</h2>
                                        <div className="space-y-4 text-sm">
                                            {/* Upload de imagem */}
                                            <div>
                                                <label className="block mb-1 text-gray-300">Foto de Perfil</label>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="w-full bg-[#2a2a2a] text-white p-2 rounded"
                                                    onChange={(event) => setEditPhoto(event.target.files?.[0] || null)}
                                                />
                                            </div>

                                            {/* Nome */}
                                            <div>
                                                <label className="block mb-1 text-gray-300">Nome</label>
                                                <input
                                                    type="text"
                                                    placeholder="Seu nome"
                                                    className="w-full bg-[#2a2a2a] text-white p-2 rounded"
                                                    value={editName}
                                                    onChange={(event) => setEditName(event.target.value)}
                                                />
                                            </div>

                                            {/* Senha */}
                                            <div>
                                                <label className="block mb-1 text-gray-300">Senha Atual</label>
                                                <input
                                                    type="password"
                                                    placeholder="Senha atual"
                                                    className="w-full bg-[#2a2a2a] text-white p-2 rounded"
                                                    value={currentPassword}
                                                    onChange={(event) => setCurrentPassword(event.target.value)}
                                                />
                                            </div>

                                            <div>
                                                <label className="block mb-1 text-gray-300">Nova Senha</label>
                                                <input
                                                    type="password"
                                                    placeholder="Nova senha"
                                                    className="w-full bg-[#2a2a2a] text-white p-2 rounded"
                                                    value={editPassword}
                                                    onChange={(event) => setEditPassword(event.target.value)}
                                                />
                                            </div>

                                            {saveError && (
                                                <p className="text-sm text-red-400">{saveError}</p>
                                            )}

                                            <div className="flex justify-end space-x-2 mt-4">
                                                <button onClick={() => setModalView('config')} className="px-4 py-2 rounded bg-gray-600 text-white">Voltar</button>
                                                <button
                                                    onClick={handleSaveAccount}
                                                    className="px-4 py-2 rounded bg-[#DF9DC0] text-black font-semibold disabled:opacity-60"
                                                    disabled={isSaving}
                                                >
                                                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}


                            </div>
                        </div>
                    )}
                    {showDropdownMenu && (
                        <div className="absolute top-full right-0 mt-2 w-64 bg-[#1F1F1F] rounded-md shadow-lg z-50 overflow-hidden border border-gray-700">
                            <button
                                onClick={() => {
                                    setShowUserMenu(true);
                                    setShowDropdownMenu(false);
                                }}
                                className="block w-full px-4 py-3 text-left text-white hover:bg-[#DF9DC0]/30"
                            >
                                Configurações
                            </button>
                            <div className="border-t border-gray-700" />
                            <button
                                onClick={logout}
                                className="block w-full px-4 py-3 text-left text-white hover:bg-[#DF9DC0]/30"
                            >
                                Encerrar sessão
                            </button>
                            <div className="border-t border-gray-700" />
                            <a
                                href="mailto:suporte@habitoFit.com.br"
                                className="block w-full px-4 py-3 text-left text-white hover:bg-[#DF9DC0]/30"
                            >
                                Enviar solicitação de suporte
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </header >
    );
}

export default Header;




