'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useMiniKit, useOpenUrl, useComposeCast, useViewProfile } from '@coinbase/onchainkit/minikit';
import { Identity, Name } from '@coinbase/onchainkit/identity';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { useConnectorClient } from 'wagmi';
import { ChevronDownIcon, CurrencyDollarIcon, ArrowPathIcon, ArrowRightIcon, ArrowLeftIcon, WalletIcon, BellIcon } from '@heroicons/react/24/outline';
import { BanknoteArrowDown, BanknoteArrowUp, Landmark, ChevronLeft, ChevronRight, Clock, Home, List, Settings, ArrowLeft } from 'lucide-react';
import { useAppTheme } from './hooks/useAppTheme';
import { cn } from './lib/utils';
import { base } from 'wagmi/chains';
import { ethers } from 'ethers';
import { stablecoins } from './data/stablecoins';
import { executeUSDCTransaction, executeTokenTransaction, getUSDCBalance, getTokenBalance } from './utils/wallet';
import { fetchTokenRate, fetchSupportedCurrencies, fetchSupportedInstitutions } from './utils/paycrest';
import { calculateDynamicFee, formatFeeInfo, isProtocolEnabled } from './utils/nedaPayProtocol';
import { getNedaPayProtocolAddress } from './config/contracts';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { useFarcasterProfile } from './hooks/useFarcasterProfile';
import Sidebar from './components/Sidebar';
import PretiumOffRampFlow from './components/PretiumOffRampFlow';
import PretiumOnRampFlow from './components/PretiumOnRampFlow';
import WithdrawFlow from './components/withdraw/WithdrawFlow';
import '../lib/i18n';

type Tab = 'home' | 'activity' | 'settings' | 'send' | 'pay' | 'deposit' | 'link' | 'withdraw';

interface Country {
  name: string;
  code: string;
  flag: string;
  currency: string;
  countryCode?: string;
  comingSoon?: boolean;
}

// Mobile number validation function
const validateMobileNumber = (phoneNumber: string, countryCode: string): { isValid: boolean; message?: string } => {
  if (!phoneNumber) return { isValid: false, message: 'Phone number is required' };

  // Remove any non-digit characters
  const cleanNumber = phoneNumber.replace(/\D/g, '');

  switch (countryCode) {
    case 'NG': // Nigeria
      if (cleanNumber.length !== 10) return { isValid: false, message: 'Nigerian numbers must be 10 digits' };
      // Comprehensive Nigerian mobile prefixes: MTN, Airtel, Glo, 9mobile - includes 070-099 and 700-799 ranges
      if (!['070', '071', '072', '073', '074', '075', '076', '077', '078', '079', '080', '081', '082', '083', '084', '085', '086', '087', '088', '089', '090', '091', '092', '093', '094', '095', '096', '097', '098', '099', '700', '701', '702', '703', '704', '705', '706', '707', '708', '709', '710', '711', '712', '713', '714', '715', '716', '717', '718', '719', '720', '721', '722', '723', '724', '725', '726', '727', '728', '729', '730', '731', '732', '733', '734', '735', '736', '737', '738', '739', '740', '741', '742', '743', '744', '745', '746', '747', '748', '749', '750', '751', '752', '753', '754', '755', '756', '757', '758', '759', '760', '761', '762', '763', '764', '765', '766', '767', '768', '769', '770', '771', '772', '773', '774', '775', '776', '777', '778', '779', '780', '781', '782', '783', '784', '785', '786', '787', '788', '789', '790', '791', '792', '793', '794', '795', '796', '797', '798', '799'].some(prefix => cleanNumber.startsWith(prefix))) {
        return { isValid: false, message: 'Invalid Nigerian mobile prefix' };
      }
      break;
    case 'KE': // Kenya
      if (cleanNumber.length !== 9) return { isValid: false, message: 'Kenyan numbers must be 9 digits' };
      // Updated Kenyan mobile prefixes: Safaricom (070-079, 011-019, 010, 020-029, 720-729), Airtel (073-075, 078, 010-019, 730-739), Telkom (077, 020-029)
      if (!['070', '071', '072', '073', '074', '075', '076', '077', '078', '079', '011', '012', '013', '014', '015', '016', '017', '018', '019', '010', '020', '021', '022', '023', '024', '025', '026', '027', '028', '029', '720', '721', '722', '723', '724', '725', '726', '727', '728', '729', '730', '731', '732', '733', '734', '735', '736', '737', '738', '739'].some(prefix => cleanNumber.startsWith(prefix))) {
        return { isValid: false, message: 'Invalid Kenyan mobile prefix' };
      }
      break;
    case 'GH': // Ghana
      if (cleanNumber.length !== 9) return { isValid: false, message: 'Ghanaian numbers must be 9 digits' };
      // Comprehensive Ghanaian mobile prefixes: MTN (024, 054, 055, 059), Vodafone (020, 050), AirtelTigo (027, 057, 026, 056)
      if (!['020', '021', '023', '024', '025', '026', '027', '028', '029', '050', '051', '052', '053', '054', '055', '056', '057', '058', '059'].some(prefix => cleanNumber.startsWith(prefix))) {
        return { isValid: false, message: 'Invalid Ghanaian mobile prefix' };
      }
      break;
    case 'TZ': // Tanzania
      if (cleanNumber.length !== 9) return { isValid: false, message: 'Tanzanian numbers must be 9 digits' };
      // Updated with comprehensive Tanzanian mobile prefixes including all major operators
      // Vodacom: 075, 076, 077, 078; Airtel: 068, 069, 078, 065, 067; Tigo: 065, 067, 071; Halotel: 061, 062; TTCL: 073, 074; Zantel: 077
      // Additional newer prefixes: 780-789 range for all operators
      if (!['061', '062', '065', '067', '068', '069', '071', '073', '074', '075', '076', '077', '078', '693', '694', '695', '696', '697', '698', '699', '780', '781', '782', '783', '784', '785', '786', '787', '788', '789'].some(prefix => cleanNumber.startsWith(prefix))) {
        return { isValid: false, message: 'Invalid Tanzanian mobile prefix' };
      }
      break;
    case 'UG': // Uganda
      if (cleanNumber.length !== 9) return { isValid: false, message: 'Ugandan numbers must be 9 digits' };
      // Comprehensive Ugandan mobile prefixes: MTN (077, 078), Airtel (070, 075), Africell (079), UTL (071), others (072-076)
      if (!['070', '071', '072', '073', '074', '075', '076', '077', '078', '079', '031', '032', '033', '034', '035', '036', '037', '038', '039', '020', '021', '022', '023', '024', '025', '026', '027', '028', '029'].some(prefix => cleanNumber.startsWith(prefix))) {
        return { isValid: false, message: 'Invalid Ugandan mobile prefix' };
      }
      break;
    case 'CI': // Ivory Coast
      if (cleanNumber.length !== 8) return { isValid: false, message: 'Ivorian numbers must be 8 digits' };
      // Comprehensive Ivorian mobile prefixes: Orange (07, 08, 09), MTN (05, 06), Moov (01, 02, 03)
      if (!['01', '02', '03', '04', '05', '06', '07', '08', '09'].some(prefix => cleanNumber.startsWith(prefix))) {
        return { isValid: false, message: 'Invalid Ivorian mobile prefix' };
      }
      break;
    case 'BJ': // Benin
      if (cleanNumber.length !== 8) return { isValid: false, message: 'Beninese numbers must be 8 digits' };
      // Comprehensive Beninese mobile prefixes: MTN (90, 91, 96, 97), Moov (94, 95, 96, 97), Glo (98, 99), others (92, 93)
      if (!['90', '91', '92', '93', '94', '95', '96', '97', '98', '99', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69'].some(prefix => cleanNumber.startsWith(prefix))) {
        return { isValid: false, message: 'Invalid Beninese mobile prefix' };
      }
      break;
    default:
      return { isValid: true }; // Allow other countries without specific validation
  }

  return { isValid: true };
};

// Countries for Send tab - all available
const sendCountries: Country[] = [
  { name: 'Nigeria', code: 'NG', flag: '🇳🇬', currency: 'NGN', countryCode: '+234', comingSoon: false },
  { name: 'Kenya', code: 'KE', flag: '🇰🇪', currency: 'KES', countryCode: '+254', comingSoon: false },
  { name: 'Tanzania', code: 'TZ', flag: '🇹🇿', currency: 'TZS', countryCode: '+255', comingSoon: false },
  { name: 'Uganda', code: 'UG', flag: '🇺🇬', currency: 'UGX', countryCode: '+256', comingSoon: false },
  { name: 'Ghana', code: 'GH', flag: '🇬🇭', currency: 'GHS', countryCode: '+233', comingSoon: false },
  { name: 'DR Congo', code: 'CD', flag: '🇨🇩', currency: 'CDF', countryCode: '+243', comingSoon: false },
  { name: 'Malawi', code: 'MW', flag: '🇲🇼', currency: 'MWK', countryCode: '+265', comingSoon: false },
];

// Countries for Pay tab - Tanzania and Kenya first, others disabled
const payCountries: Country[] = [
  { name: 'Tanzania', code: 'TZ', flag: '🇹🇿', currency: 'TZS', countryCode: '+255', comingSoon: false },
  { name: 'Kenya', code: 'KE', flag: '🇰🇪', currency: 'KES', countryCode: '+254', comingSoon: false },
  { name: 'Nigeria', code: 'NG', flag: '🇳🇬', currency: 'NGN', countryCode: '+234', comingSoon: true },
  { name: 'Ghana', code: 'GH', flag: '🇬🇭', currency: 'GHS', countryCode: '+233', comingSoon: true },
  { name: 'Uganda', code: 'UG', flag: '🇺🇬', currency: 'UGX', countryCode: '+256', comingSoon: true },
  { name: 'Ivory Coast', code: 'CI', flag: '🇨🇮', currency: 'XOF', countryCode: '+225', comingSoon: true },
  { name: 'Benin', code: 'BJ', flag: '🇧🇯', currency: 'XOF', countryCode: '+229', comingSoon: true },
];

// Default to send countries for backward compatibility
const countries: Country[] = sendCountries;

interface Currency {
  code: string;
  name: string;
  shortName: string;
  decimals: number;
  symbol: string;
  marketRate: string;
}



export default function FarcasterMiniApp() {



  const { t, i18n } = useTranslation();
  const { isLight } = useAppTheme();

  // DIRECT FARCASTER USER STATE
  const [farcasterUser, setFarcasterUser] = useState<any>(null);

  // LISTEN FOR FRAME MESSAGES THAT MIGHT CONTAIN USER DATA
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Check if message contains user data
      if (event.data && typeof event.data === 'object') {
        if (event.data.user?.fid || event.data.fid) {
          const userFid = event.data.user?.fid || event.data.fid;
          console.log('🎯 FOUND USER FID FROM FRAME MESSAGE:', userFid);

          // Fetch user data with this FID (for any user, not just specific ones)
          if (userFid && userFid !== 9152 && !isNaN(parseInt(userFid))) {
            fetch(`/api/farcaster-user?fid=${userFid}`)
              .then(response => response.json())
              .then(userData => {
                console.log('✅ USER DATA FROM FRAME MESSAGE:', userData);
                setFarcasterUser(userData);
              })
              .catch(error => console.error('❌ Error fetching with frame message FID:', error));
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // LISTEN FOR MINIKIT USER DETECTION FROM PROVIDER
  useEffect(() => {
    const handleUserDetected = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { fid, context } = customEvent.detail;
      console.log('🎯 MiniKit user detected event received!');
      console.log('  FID:', fid);
      console.log('  Context:', context);

      if (fid && fid !== 9152) {
        console.log('🎯 Loading profile for detected FID:', fid);
        try {
          const response = await fetch(`/api/farcaster-user?fid=${fid}`);
          if (response.ok) {
            const userData = await response.json();
            console.log('✅ USER PROFILE LOADED:', userData);
            setFarcasterUser(userData);
          } else {
            console.error('❌ Failed to load profile for FID:', fid);
          }
        } catch (error) {
          console.error('❌ Error loading profile:', error);
        }
      }
    };

    window.addEventListener('minikit-user-detected', handleUserDetected);

    return () => {
      window.removeEventListener('minikit-user-detected', handleUserDetected);
    };
  }, []);

  // Helper function to render token icon
  const renderTokenIcon = (token: any, className: string = "w-4 h-4") => {
    if (token.baseToken === 'USDC') {
      return <img src="/assets/logos/usdc-logo.png" alt="USDC" className={className} />;
    } else if (token.baseToken === 'USDT') {
      return <img src="/usdt.png" alt="USDT" className={className} />;
    } else if (token.baseToken === 'cUSD') {
      return <img src="/cUSD.png" alt="cUSD" className={className} />;
    } else if (token.flag && token.flag.startsWith('/')) {
      // Use the new icon path
      return <img src={token.flag} alt={token.baseToken} className={className} />;
    } else {
      // Fallback to emoji or default icon
      return <span className={className.includes('w-3') ? 'text-xs' : className.includes('w-5') ? 'text-lg' : 'text-sm'}>{token.flag || '🌍'}</span>;
    }
  };
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [selectedToken, setSelectedToken] = useState(stablecoins[0]);
  const [selectedCountry, setSelectedCountry] = useState(countries[3]);
  const [amount, setAmount] = useState('');

  // Dynamic theme based on selected token - using official Celo brand colors
  const isCeloToken = selectedToken.chainId === 42220; // Celo mainnet
  const themeColors = isCeloToken ? {
    primary: 'celo-prosperity',
    primaryHover: 'celo-yellow-dark',
    secondary: 'celo-forest',
    gradient: 'from-[#FCFF52] via-[#FDFF8B] to-[#FCFF52]', // Celo Prosperity Yellow
    gradientHover: 'from-[#FDFF8B] via-[#FCFF52] to-[#E8ED3F]',
    border: 'celo-prosperity/50',
    borderHover: 'celo-prosperity/70',
    shadow: 'celo-prosperity/30',
    bg: 'celo-prosperity/20',
    indicator: 'celo-prosperity'
  } : {
    primary: 'blue-500',
    primaryHover: 'blue-600',
    secondary: 'purple-600',
    gradient: 'from-blue-500 via-indigo-600 to-purple-600',
    gradientHover: 'from-blue-400 via-indigo-500 to-purple-500',
    border: 'blue-400/50',
    borderHover: 'blue-300/70',
    shadow: 'blue-500/30',
    bg: 'blue-600/20',
    indicator: 'blue-400'
  };

  // Format numbers with commas for better readability
  const formatNumber = (num: string | number): string => {
    const numStr = typeof num === 'string' ? num : num.toString();
    const parts = numStr.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  // Initialize language from localStorage
  useEffect(() => {
    const savedLanguage = localStorage.getItem('nedapay-language');
    if (savedLanguage && savedLanguage !== i18n.language) {
      i18n.changeLanguage(savedLanguage);
    }
  }, [i18n]);

  // Auto-detect country based on geolocation for send tab
  useEffect(() => {
    const detectCountry = async () => {
      try {
        // Use ipapi.co for geolocation (free, no API key required)
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();

        if (data.country_code) {
          // Find matching country in sendCountries
          const detectedCountry = sendCountries.find(
            country => country.code === data.country_code
          );

          if (detectedCountry && !detectedCountry.comingSoon) {
            console.log('🌍 Auto-detected country:', detectedCountry.name);
            setSelectedCountry(detectedCountry);
          } else {
            // Fallback to Tanzania if country not supported
            const fallbackCountry = sendCountries.find(c => c.code === 'TZ');
            if (fallbackCountry) {
              setSelectedCountry(fallbackCountry);
            }
          }
        }
      } catch (error) {
        console.error('Failed to detect country:', error);
        // Keep default country (Uganda) if geolocation fails
      }
    };

    detectCountry();
  }, []);

  // MiniKit and Wagmi hooks for smart wallet (Farcaster/Coinbase) - moved up
  const { address, isConnected } = useAccount();
  const { connect, connectors, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: walletClient } = useConnectorClient();
  const { switchChain } = useSwitchChain();

  // Official SDK detection — true for both Farcaster and Base App
  const [inMiniApp, setInMiniApp] = useState(false);
  const miniAppChecked = useRef(false);
  useEffect(() => {
    if (miniAppChecked.current) return;
    miniAppChecked.current = true;
    import('@farcaster/miniapp-sdk').then(({ sdk: fcSdk }) => {
      fcSdk.isInMiniApp().then((result: boolean) => {
        console.log('🔍 sdk.isInMiniApp():', result);
        setInMiniApp(result);
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  // Detect if we're in a smart wallet environment (Farcaster MiniApp) - enhanced detection
  const isSmartWalletEnvironment = useMemo(() => {
    if (typeof window === 'undefined') return false;

    const url = window.location.href.toLowerCase();
    const referrer = document.referrer.toLowerCase();
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /mobile|android|iphone|ipad/i.test(navigator.userAgent);

    // Check for official Farcaster MiniApp URLs
    const isFarcasterOfficial = url.includes('warpcast.com/~/') ||
      url.includes('farcaster.xyz/miniapp') ||
      url.includes('farcaster.xyz/miniapps') ||
      url.includes('fc_frame=') ||
      url.includes('fc_miniapp=') ||
      referrer.includes('warpcast.com') ||
      referrer.includes('farcaster.xyz');

    // Check for Base App (also uses the Farcaster mini app protocol)
    const isBaseAppOfficial =
      referrer.includes('base.org') ||
      referrer.includes('base.app') ||
      referrer.includes('base.dev') ||
      url.includes('base.org') ||
      url.includes('base.app');

    // Check for MiniKit SDK presence
    const hasMiniKit = typeof (window as any).MiniKit !== 'undefined';

    // Check for mobile webview patterns
    const isMobileWebview = userAgent.includes('wv') ||
      userAgent.includes('webview') ||
      (userAgent.includes('mobile') && !userAgent.includes('safari'));

    // AGGRESSIVE mobile detection - if mobile and not our main site, assume Farcaster/Base
    const isMobileFarcaster = isMobile && (
      isFarcasterOfficial ||
      isBaseAppOfficial ||
      hasMiniKit ||
      isMobileWebview ||
      // If mobile and not our main domain, likely Farcaster or Base App
      (!url.includes('miniapp.nedapay.xyz') && !url.includes('localhost'))
    );

    const result = isFarcasterOfficial || isBaseAppOfficial || hasMiniKit || isMobileWebview || isMobileFarcaster;

    console.log('🔍 Environment Detection:', {
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      isMobile,
      isFarcasterOfficial,
      isBaseAppOfficial,
      hasMiniKit,
      isMobileWebview,
      isMobileFarcaster,
      result
    });

    return result;
  }, []);

  // Unified wallet state - simplified to use wagmi for all environments
  const walletAddress = address;
  const isWalletConnected = isConnected;
  const isWalletReady = true;

  // Debug component initialization
  useEffect(() => {
    console.log('FarcasterMiniApp component initializing:', {
      url: window.location.href,
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      isSmartWalletEnvironment,
      hasMiniKit: typeof (window as any).MiniKit !== 'undefined',
      hasWindowEthereum: typeof (window as any).ethereum !== 'undefined',
      walletAddress,
      isWalletConnected,
      timestamp: new Date().toISOString()
    });
  }, [isSmartWalletEnvironment, walletAddress, isWalletConnected]);

  // Single authoritative auto-connect for Farcaster + Base App
  // inMiniApp (from sdk.isInMiniApp()) covers both Farcaster and Base App
  useEffect(() => {
    if (isConnected || connectors.length === 0) return;
    if (!inMiniApp && !isSmartWalletEnvironment) return;

    const farcasterConnector = connectors.find(c => c.id === 'farcaster') ?? connectors[0];
    let attempt = 0;

    const tryConnect = () => {
      if (isConnected) return;
      attempt++;
      console.log(`🔗 Mini-app auto-connect attempt ${attempt} via ${farcasterConnector.name}`);
      connect({ connector: farcasterConnector });
      if (attempt < 3) setTimeout(tryConnect, 3000);
    };

    const timer = setTimeout(tryConnect, 1500);
    return () => clearTimeout(timer);
  }, [inMiniApp, isSmartWalletEnvironment, isConnected, connectors, connect]);



  const [phoneNumber, setPhoneNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [tillNumber, setTillNumber] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  // Removed duplicate walletAddress state - using connectedWallet?.address directly
  const [description, setDescription] = useState('');
  const [linkAmount, setLinkAmount] = useState('6');
  const [linkDescription, setLinkDescription] = useState('');
  const [selectedStablecoin, setSelectedStablecoin] = useState(stablecoins[0]);
  const [generatedLink, setGeneratedLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [paymentType, setPaymentType] = useState<'goods' | 'bill'>('goods');

  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [currentRate, setCurrentRate] = useState('2547');
  const [currencies, setCurrencies] = useState<Array<{ code: string; name: string; symbol: string }>>([]);

  const [institutions, setInstitutions] = useState<Array<{ name: string; code: string; type: string }>>([]);
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState(false);
  const [sendCurrency, setSendCurrency] = useState<'local' | 'usdc'>('usdc');
  const [payCurrency, setPayCurrency] = useState<'local' | 'usdc'>('usdc');
  const [selectedSendToken, setSelectedSendToken] = useState('USDC');
  const [selectedPayToken, setSelectedPayToken] = useState('USDC');
  const [showSendTokenDropdown, setShowSendTokenDropdown] = useState(false);
  const [showPayTokenDropdown, setShowPayTokenDropdown] = useState(false);
  const [showDepositTokenDropdown, setShowDepositTokenDropdown] = useState(false);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);

  // Deposit (On-Ramp) state variables
  const [depositStep, setDepositStep] = useState<1 | 2 | 3 | 4>(1);
  const [depositAmount, setDepositAmount] = useState('100');
  const [depositCountry, setDepositCountry] = useState('');
  const [depositNetwork, setDepositNetwork] = useState('');
  const [depositPhone, setDepositPhone] = useState('');
  const [depositChain, setDepositChain] = useState<'BASE' | 'POLYGON' | 'CELO' | 'SCROLL'>('BASE');
  const [depositAsset, setDepositAsset] = useState<'USDC' | 'USDT' | 'NTZS'>('USDC');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositStatus, setDepositStatus] = useState<string | null>(null);
  const [depositTransactionCode, setDepositTransactionCode] = useState<string | null>(null);
  const [depositPolling, setDepositPolling] = useState(false);
  const [depositExchangeRate, setDepositExchangeRate] = useState<number | null>(null);
  const [depositLoadingRate, setDepositLoadingRate] = useState(false);
  const [pretiumNetworks, setPretiumNetworks] = useState<Record<string, Array<{ code: string; name: string }>>>({});
  const [pretiumCountries, setPretiumCountries] = useState<Record<string, string>>({});
  const [pretiumCurrencies, setPretiumCurrencies] = useState<Array<{ country: string; currency_code: string }>>([]);
  const [isSwipeComplete, setIsSwipeComplete] = useState(false);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [walletBalance, setWalletBalance] = useState('0.00');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [sendStep, setSendStep] = useState<'country' | 'recipient' | 'confirm'>('country');
  const [isDepositCountryOpen, setIsDepositCountryOpen] = useState(false);
  const [orderedCountries, setOrderedCountries] = useState<Country[]>(countries);
  const [userLocation, setUserLocation] = useState<string | null>(null);

  const [showInvoiceCurrencyDropdown, setShowInvoiceCurrencyDropdown] = useState(false);
  const [showLinkCurrencyDropdown, setShowLinkCurrencyDropdown] = useState(false);


  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [successData, setSuccessData] = useState<{
    orderId: string;
    hash?: string;
    amount: string;
    recipient: string;
    type: 'send' | 'pay';
    token: 'USDC' | 'USDT';
  } | null>(null);

  const [errorData, setErrorData] = useState<{
    title: string;
    message: string;
    suggestion?: string;
  } | null>(null);

  // Track user's preferred wallet selection
  const [preferredWalletType, setPreferredWalletType] = useState<string | null>(null);
  const [addressCopied, setAddressCopied] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [userTransactions, setUserTransactions] = useState<Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    txHash: string;
    recipient?: string;
    type?: string;
    createdAt: string;
  }>>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    timestamp: string;
    type: 'send' | 'pay' | 'deposit' | 'general';
    read: boolean;
  }>>([]);

  // Function to add notification (with database persistence)
  const addNotification = useCallback(async (
    message: string,
    type: 'send' | 'pay' | 'deposit' | 'general' = 'general',
    transactionData?: {
      hash?: string;
      amount?: string;
      currency?: string;
      recipient?: string;
      orderId?: string;
    }
  ) => {
    const newNotification = {
      id: Date.now().toString(),
      message,
      timestamp: new Date().toLocaleString(),
      type,
      read: false
    };

    // Add to local state immediately for instant UI feedback
    setNotifications(prev => [newNotification, ...prev]);

    try {
      // Save to database if wallet is connected
      if (walletAddress) {
        // First, save transaction if transaction data is provided
        let transactionId = null;
        if (transactionData?.hash) {
          try {
            // Normalize wallet address to lowercase for consistent storage
            const normalizedWallet = walletAddress.toLowerCase();
            console.log('💾 Saving transaction with merchantId:', normalizedWallet);
            const transactionResponse = await fetch('/api/transactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                merchantId: normalizedWallet,
                wallet: normalizedWallet,
                amount: transactionData.amount || '0',
                currency: transactionData.currency || 'USDC',
                status: 'Completed',
                txHash: transactionData.hash,
                recipient: transactionData.recipient,
                orderId: transactionData.orderId,
                type: type, // 'send', 'pay', etc.
                network: transactionData.currency === 'USDT' || transactionData.currency === 'cUSD' ? 'celo' : 'base'
              })
            });

            if (transactionResponse.ok) {
              const transaction = await transactionResponse.json();
              transactionId = transaction.id;
              console.log('✅ Transaction saved to database:', transaction.id);
            }
          } catch (error) {
            console.warn('⚠️ Failed to save transaction to database:', error);
          }
        }

        // Save notification to database
        const notificationResponse = await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            recipient: walletAddress,
            type,
            status: 'unseen',
            relatedTransactionId: transactionId
          })
        });

        if (notificationResponse.ok) {
          const savedNotification = await notificationResponse.json();
          console.log('✅ Notification saved to database:', savedNotification.id);

          // Update local state with database ID
          setNotifications(prev =>
            prev.map(notif =>
              notif.id === newNotification.id
                ? { ...notif, id: savedNotification.id }
                : notif
            )
          );
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to save notification to database:', error);
      // Continue with local-only notification
    }
  }, [walletAddress]);

  // Function to handle notification click - mark as read and show details
  const handleNotificationClick = useCallback(async (notification: any) => {
    console.log('Notification clicked:', notification);

    // Mark as read
    setNotifications(prev =>
      prev.map(notif => notif.id === notification.id ? { ...notif, read: true } : notif)
    );

    try {
      // Update in database
      await fetch(`/api/notifications?id=${notification.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'seen' })
      });
    } catch (error) {
      console.warn('⚠️ Failed to update notification status in database:', error);
    }

    // Show transaction details if available
    if (notification.relatedTransaction) {
      console.log('Opening transaction details:', notification.relatedTransaction);
      // Dispatch event to show transaction modal in NotificationTab
      const event = new CustomEvent('show-transaction-details', {
        detail: { transaction: notification.relatedTransaction }
      });
      window.dispatchEvent(event);
    } else if (notification.relatedTransactionId) {
      // Try to fetch the transaction details if not already included
      try {
        const response = await fetch(`/api/transactions?id=${notification.relatedTransactionId}`);
        if (response.ok) {
          const transaction = await response.json();
          console.log('Fetched transaction details:', transaction);
          // Dispatch event to show transaction modal
          const event = new CustomEvent('show-transaction-details', {
            detail: { transaction }
          });
          window.dispatchEvent(event);
          return;
        }
      } catch (error) {
        console.warn('Failed to fetch transaction details:', error);
      }
      console.log('Transaction details could not be loaded for this notification');
    } else {
      console.log('No linked transaction data for this notification');
    }
  }, []);

  // Keep old function for compatibility
  const markNotificationAsRead = useCallback(async (id: string) => {
    setNotifications(prev =>
      prev.map(notif => notif.id === id ? { ...notif, read: true } : notif)
    );

    try {
      await fetch(`/api/notifications?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'seen' })
      });
    } catch (error) {
      console.warn('⚠️ Failed to update notification status in database:', error);
    }
  }, []);

  // Function to load user transactions (fetches from API)
  const loadUserTransactions = useCallback(async () => {
    if (!walletAddress) {
      console.log('⚠️ No wallet address, skipping transaction load');
      return;
    }

    // Normalize wallet address to lowercase for consistent querying
    const normalizedWallet = walletAddress.toLowerCase();
    console.log(`🔄 Fetching transactions for wallet: ${normalizedWallet}`);
    setTransactionsLoading(true);
    try {
      // Use transactions endpoint that fetches from NedaPay API
      const response = await fetch(`/api/transactions?merchantId=${normalizedWallet}`);
      console.log(`📡 Transactions API response status: ${response.status}`);
      if (response.ok) {
        const data = await response.json();
        setUserTransactions(data.transactions || []);
        console.log(`✅ Loaded ${data.transactions?.length || 0} total transactions`);
        console.log(`📊 Stats:`, data.stats);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to fetch transactions:', errorText);
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch transactions:', error);
    } finally {
      setTransactionsLoading(false);
    }
  }, [walletAddress]);

  // Function to load notifications from database
  const loadNotifications = useCallback(async () => {
    if (!walletAddress) return;

    try {
      const response = await fetch(`/api/notifications?recipient=${walletAddress}&limit=50`);
      if (response.ok) {
        const dbNotifications = await response.json();

        // Transform database notifications to match local state format
        const transformedNotifications = dbNotifications.map((notif: any) => ({
          id: notif.id,
          message: notif.message,
          timestamp: new Date(notif.createdAt).toLocaleString(),
          type: notif.type,
          read: notif.status === 'seen'
        }));

        setNotifications(transformedNotifications);
        console.log(`✅ Loaded ${transformedNotifications.length} notifications from database`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load notifications from database:', error);
    }
  }, [walletAddress]);

  // Function to clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Base App navigation hooks (required for BaseApp compatibility)
  const minikit = useMiniKit();
  const { setFrameReady, isFrameReady, context } = minikit;
  const openUrl = useOpenUrl();
  const composeCast = useComposeCast();
  const viewProfile = useViewProfile();

  // Base App client detection (clientFid 309857 = Base App)
  const isBaseApp = context?.client?.clientFid === 309857;

  // Farcaster profile integration
  const { profile: farcasterProfile, isLoading: farcasterLoading, isFarcasterEnvironment } = useFarcasterProfile();

  // Removed hardcoded FID 9152 fetch - no more automatic calls

  // Debug Farcaster profile integration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🎭 FARCASTER PROFILE DEBUG:', {
        isFarcasterEnvironment,
        farcasterProfile,
        farcasterLoading,
        hasMiniKit: !!(window as any).MiniKit,
        miniKitUser: (window as any).MiniKit?.user
      });
    }
  }, [isFarcasterEnvironment, farcasterProfile, farcasterLoading]);

  // MiniKit Auto-Connection: Farcaster smart wallet integration
  const connectedWallet = (() => {
    if (!isWalletConnected || !walletAddress) return null;

    // MiniKit automatically connects to Farcaster smart wallet when available
    // Return a simplified wallet object for compatibility with existing code
    return {
      address: address,
      connectorType: 'farcaster_minikit',
      walletClientType: 'farcaster',
      getEthereumProvider: () => walletClient
    };
  })();

  // Debug MiniKit wallet info and Base App detection
  useEffect(() => {
    console.log('=== MINIKIT WALLET DEBUG ===');
    console.log('Is Connected:', isConnected);
    console.log('Address:', address);
    console.log('Connectors Available:', connectors.length);
    console.log('Wallet Client:', !!walletClient);
    console.log('Is Base App:', isBaseApp);
    // Removed Client FID log - that's just the Warpcast client, not the user

    if (connectedWallet) {
      console.log('🔍 CONNECTED WALLET:', {
        address: connectedWallet.address,
        shortAddress: connectedWallet.address?.substring(0, 6) + '...' + connectedWallet.address?.substring(-4),
        connectorType: connectedWallet.connectorType,
        walletClientType: connectedWallet.walletClientType
      });
      console.log('🎆 USER SHOULD SEE: Farcaster Smart Wallet (MiniKit auto-connected)');
    } else {
      console.log('No wallet connected');
      setWalletBalance('0.00');
    }

    if (isBaseApp) {
      console.log('🏗️ Running in Base App - using Base App specific features');
    }
    console.log('===================');
  }, [connectedWallet, isConnected, address, connectors.length, walletClient, isBaseApp, context]);

  // MiniKit initialization - signal when app is ready (Farcaster and Base App)
  useEffect(() => {
    if ((inMiniApp || isSmartWalletEnvironment || isBaseApp) && setFrameReady) {
      const timer = setTimeout(() => {
        setFrameReady();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [inMiniApp, isSmartWalletEnvironment, isBaseApp, setFrameReady]);

  // Base App dedicated auto-connect using the definitive clientFid === 309857 signal.
  // This fires when MiniKit context loads and confirms Base App — more reliable than
  // URL heuristics or sdk.isInMiniApp() which may resolve before the host bridge is ready.
  useEffect(() => {
    if (!isBaseApp || isConnected || connectors.length === 0) return;
    const farcasterConnector = connectors.find(c => c.id === 'farcaster') ?? connectors[0];
    let attempt = 0;
    const tryConnect = () => {
      if (isConnected) return;
      attempt++;
      console.log(`🔗 [Base App] auto-connect attempt ${attempt} via ${farcasterConnector.name}`);
      connect({ connector: farcasterConnector });
      if (attempt < 3) setTimeout(tryConnect, 3000);
    };
    const timer = setTimeout(tryConnect, 500);
    return () => clearTimeout(timer);
  }, [isBaseApp, isConnected, connectors, connect]);

  // MiniKit handles wallet connections automatically - no manual tracking needed

  // Removed duplicate handleGeneratePaymentLink function - using the one defined later

  // Fetch real USDC wallet balance
  const fetchWalletBalance = useCallback(async (tokenSymbol?: string) => {
    if (!walletAddress || !isConnected) {
      console.log('⚠️ No wallet address or not connected');
      setWalletBalance('0.00');
      return;
    }

    // Determine which token to fetch balance for
    const currentTab = activeTab;
    let selectedToken = tokenSymbol;

    if (!selectedToken) {
      if (currentTab === 'send') {
        selectedToken = sendCurrency === 'usdc' ? selectedSendToken : 'USDC';
      } else if (currentTab === 'pay') {
        selectedToken = payCurrency === 'usdc' ? selectedPayToken : 'USDC';
      } else {
        selectedToken = 'USDC'; // Default for other tabs
      }
    }

    console.log('💰 Fetching balance for:', walletAddress, 'Token:', selectedToken);

    try {
      // Find token data
      const tokenData = stablecoins.find(token => token.baseToken === selectedToken);
      if (!tokenData) {
        console.error('❌ Token not found:', selectedToken);
        setWalletBalance('0.00');
        return;
      }

      // Use the new generic token balance function
      const balance = await getTokenBalance(walletAddress, tokenData);
      const displayBalance = parseFloat(balance).toFixed(tokenData.decimals === 2 ? 2 : 2);

      console.log('✅ Balance fetched:', displayBalance, selectedToken);
      setWalletBalance(displayBalance);
    } catch (error) {
      console.error('❌ Balance fetch failed:', error);
      setWalletBalance('0.00');
    }
  }, [walletAddress, isConnected, activeTab, sendCurrency, selectedSendToken, payCurrency, selectedPayToken, stablecoins]);

  // Fetch balance when wallet connects or address changes
  useEffect(() => {
    console.log('🔄 Balance useEffect triggered:', { isConnected, walletAddress });
    if (isConnected && walletAddress) {
      console.log('🔄 Conditions met, fetching balance for:', walletAddress);
      fetchWalletBalance();
      loadNotifications(); // Load transaction history from database
    } else {
      console.log('⚠️ Balance fetch skipped - not connected or no address');
    }
  }, [fetchWalletBalance, loadNotifications, isConnected, walletAddress]);

  // Load transactions when on Home or Activity tab
  useEffect(() => {
    if ((activeTab === 'home' || activeTab === 'activity') && walletAddress) {
      loadUserTransactions();
    }
  }, [activeTab, walletAddress, loadUserTransactions]);

  // Manual balance refresh function
  const refreshBalance = useCallback(() => {
    console.log('🔄 Manual balance refresh triggered');
    fetchWalletBalance();
  }, [fetchWalletBalance]);

  // Monitor wallet balance state changes
  useEffect(() => {
    console.log('💰 Wallet balance state changed to:', walletBalance);
  }, [walletBalance]);

  // Fetch real-time rate from Paycrest
  const fetchRate = useCallback(async (currency: string, tokenOverride?: string) => {
    if (!currency || currency === 'USDC') return;

    try {
      setIsLoadingRate(true);
      console.log(`💱 Fetching rate for ${currency}...`);

      // Determine which token to use based on current tab
      const currentToken = tokenOverride || (activeTab === 'send' ? selectedSendToken : selectedPayToken);

      const rate = await fetchTokenRate(currentToken as 'USDC' | 'USDT', 1, currency);
      setCurrentRate(rate);

      console.log(`✅ Rate fetched successfully for ${currency}: ${rate}`);


    } catch (error: any) {
      console.error(`❌ Failed to fetch rate for ${currency}:`, error?.message || 'API Error');
      setCurrentRate('0');
    } finally {
      setIsLoadingRate(false);
    }
  }, [selectedSendToken, selectedPayToken, activeTab]);

  // Calculate fees and totals with proper currency handling
  const calculatePaymentDetails = useCallback(() => {
    const amountNum = parseFloat(amount) || 0;
    const rate = parseFloat(currentRate) || 1;

    // Determine if we're working with local currency or USDC
    const isLocalCurrency = sendCurrency === 'local' || payCurrency === 'local';

    if (isLocalCurrency) {
      // Amount is in local currency (TZS, KES, etc.)
      const percentageFee = amountNum * 0.005; // 0.5%
      const fixedFee = 0.36; // Fixed fee in local currency
      const totalFee = percentageFee + fixedFee;
      const totalLocal = amountNum + totalFee;
      const usdcAmount = totalLocal / rate;

      return {
        totalLocal: totalLocal.toFixed(2),
        fee: totalFee.toFixed(2),
        usdcAmount: usdcAmount.toFixed(6)
      };
    } else {
      // Amount is in USDC
      const usdcAmount = amountNum;
      const localEquivalent = usdcAmount * rate;
      const percentageFee = localEquivalent * 0.005;
      const fixedFee = 0.36;
      const totalFee = percentageFee + fixedFee;
      const totalLocal = localEquivalent + totalFee;

      return {
        totalLocal: totalLocal.toFixed(2),
        fee: totalFee.toFixed(2),
        usdcAmount: usdcAmount.toFixed(6)
      };
    }
  }, [amount, currentRate, sendCurrency, payCurrency]);

  // Load supported currencies and institutions
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('🔄 Country changed, loading institutions for:', selectedCountry.name, selectedCountry.currency);

        // Set loading state and clear selected institution to prevent mismatch
        setIsLoadingInstitutions(true);
        setSelectedInstitution('');

        const [supportedCurrencies, supportedInstitutions] = await Promise.all([
          fetchSupportedCurrencies(),
          fetchSupportedInstitutions(selectedCountry.currency)
        ]);

        setCurrencies(supportedCurrencies);

        // Keep all institutions for all countries
        let filteredInstitutions = supportedInstitutions;

        // For Kenya, move M-Pesa to the top of the list
        if (selectedCountry.code === 'KE') {
          const mpesaIndex = filteredInstitutions.findIndex(institution =>
            institution.name.toLowerCase().includes('mpesa') ||
            institution.name.toLowerCase().includes('m-pesa')
          );

          if (mpesaIndex > 0) {
            const mpesa = filteredInstitutions[mpesaIndex];
            filteredInstitutions = [
              mpesa,
              ...filteredInstitutions.slice(0, mpesaIndex),
              ...filteredInstitutions.slice(mpesaIndex + 1)
            ];
          }
        }

        setInstitutions(filteredInstitutions);

        // Always set default institution to the first one when institutions are loaded
        if (filteredInstitutions.length > 0) {
          setSelectedInstitution(filteredInstitutions[0].code);
          console.log('🏦 Auto-selected institution for', selectedCountry.name, ':', filteredInstitutions[0].name);
        } else {
          console.warn('⚠️ No institutions found for', selectedCountry.name, selectedCountry.currency);
        }



      } catch (error) {
        console.error('Failed to load currencies and institutions:', error);
      } finally {
        setIsLoadingInstitutions(false);
      }
    };

    loadData();
  }, [selectedCountry]);

  // Fetch rate when country or token changes
  useEffect(() => {
    fetchRate(selectedCountry.currency);
  }, [selectedCountry, selectedSendToken, selectedPayToken, fetchRate]);

  // Fetch rate when switching tabs to ensure correct token rate is displayed
  useEffect(() => {
    if (activeTab && selectedCountry.currency !== 'USDC') {
      fetchRate(selectedCountry.currency);
    }
  }, [activeTab, fetchRate, selectedCountry.currency]);

  // MiniKit initialization (already declared above)


  // Geolocation detection to reorder countries based on user location
  useEffect(() => {
    const detectUserLocation = async () => {
      try {
        // First try to get location from IP geolocation API
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();

        if (data.country_code) {
          const detectedCountry = countries.find(c => c.code === data.country_code);
          if (detectedCountry) {
            console.log('🌍 Detected user location:', detectedCountry.name);
            setUserLocation(data.country_code);

            // Reorder countries to put user's country first
            const reorderedCountries = [
              detectedCountry,
              ...countries.filter(c => c.code !== data.country_code)
            ];
            setOrderedCountries(reorderedCountries);

            // Set as default selected country if not already set
            if (selectedCountry.code === countries[0].code) {
              setSelectedCountry(detectedCountry);
            }
          }
        }
      } catch (error) {
        console.log('🚫 Could not detect user location:', error);
        // Fallback to default country order
        setOrderedCountries(countries);
      }
    };

    detectUserLocation();
  }, []); // Run once on component mount

  const paymentDetails = calculatePaymentDetails();

  // Using imported executeUSDCTransaction from utils/wallet.ts

  // Proper Farcaster MiniApp transaction using wagmi hooks (per official docs)
  const executeFarcasterTransaction = useCallback(async (
    toAddress: string,
    amount: number,
    tokenData?: any
  ): Promise<{ success: boolean; hash: string }> => {
    try {
      console.log('🎆 Executing Farcaster MiniApp transaction:', {
        to: toAddress,
        amount,
        isConnected,
        address
      });

      if (!isConnected || !address) {
        throw new Error('Wallet not connected in Farcaster');
      }

      // Determine token contract and decimals based on network
      const isUSDT = tokenData?.baseToken === 'USDT';
      const isCUSD = tokenData?.baseToken === 'cUSD';
      const isCeloToken = isUSDT || isCUSD;

      console.log('🔍 Token Detection Debug:', {
        tokenDataBaseToken: tokenData?.baseToken,
        isUSDT,
        isCUSD,
        isCeloToken,
        tokenDataChainId: tokenData?.chainId
      });

      const tokenContract = isCeloToken
        ? (isUSDT ? '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e' : '0x765DE816845861e75A25fCA122bb6898B8B1282a') // USDT : cUSD on Celo
        : '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base
      const decimals = tokenData?.decimals || 6;
      const chainId = isCeloToken ? 42220 : 8453; // Celo : Base

      console.log('🔍 Final Transaction Config:', {
        tokenContract,
        chainId,
        chainName: isCeloToken ? 'Celo' : 'Base',
        decimals
      });

      // Convert amount to token decimals
      const amountInUnits = BigInt(Math.floor(amount * Math.pow(10, decimals)));

      // Encode USDC transfer function call
      const transferData = `0xa9059cbb${toAddress.slice(2).padStart(64, '0')}${amountInUnits.toString(16).padStart(64, '0')}`;

      // Use wagmi's writeContract approach for Farcaster MiniApps
      const { writeContract, switchChain } = await import('wagmi/actions');
      const { config } = await import('../providers/MiniKitProvider');

      // Switch to the correct chain before executing transaction - be more aggressive
      try {
        console.log(`🔄 Attempting to switch to chain ${chainId} (${isCeloToken ? 'Celo' : 'Base'}) for ${tokenData?.baseToken}`);
        await switchChain(config, { chainId: chainId });
        console.log(`✅ Successfully switched to chain ${chainId} (${isCeloToken ? 'Celo' : 'Base'})`);

        // Wait longer for chain switch to complete in MiniKit
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Verify the chain switch was successful with multiple attempts
        const { getAccount } = await import('wagmi/actions');
        let attempts = 0;
        let currentAccount = getAccount(config);

        while (currentAccount.chainId !== chainId && attempts < 3) {
          console.log(`🔄 Chain verification attempt ${attempts + 1}: current=${currentAccount.chainId}, expected=${chainId}`);

          if (isCeloToken) {
            console.log('🔄 Retrying chain switch for Celo token...');
            await switchChain(config, { chainId: chainId });
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

          currentAccount = getAccount(config);
          attempts++;
        }

        console.log(`🔍 Final chain verification: ${currentAccount.chainId} (expected: ${chainId})`);

        if (currentAccount.chainId !== chainId && isCeloToken) {
          throw new Error(`Unable to switch to Celo network after multiple attempts. Please manually switch to Celo network in your wallet.`);
        }
      } catch (switchError) {
        console.error('❌ Chain switch failed:', switchError);
        // For Celo tokens, this is critical - throw error if we can't switch to Celo
        if (isCeloToken) {
          throw new Error(`Failed to switch to Celo network for ${tokenData?.baseToken} transaction. Please ensure your wallet supports Celo network and try again.`);
        }
        console.log('⚠️ Continuing with current chain for Base token');
      }

      const hash = await writeContract(config, {
        address: tokenContract as `0x${string}`,
        abi: [
          {
            name: 'transfer',
            type: 'function',
            inputs: [
              { name: 'to', type: 'address' },
              { name: 'amount', type: 'uint256' }
            ],
            outputs: [{ name: '', type: 'bool' }],
            stateMutability: 'nonpayable'
          }
        ],
        functionName: 'transfer',
        args: [toAddress as `0x${string}`, amountInUnits],
        chainId: chainId
      });

      console.log('✅ Farcaster transaction sent:', hash);

      return {
        success: true,
        hash: hash
      };
    } catch (error: any) {
      console.error('❌ Farcaster transaction failed:', error);

      if (error?.message?.includes('user rejected') || error?.message?.includes('denied')) {
        throw new Error('Transaction was rejected by user');
      } else if (error?.message?.includes('insufficient funds')) {
        throw new Error('Insufficient USDC balance');
      } else {
        throw new Error(`Farcaster transaction failed: ${error?.message || 'Unknown error'}`);
      }
    }
  }, [isConnected, address]);

  // Execute individual transactions with reasonable approval optimization
  const executeOptimizedTransactions = useCallback(async (
    approvalNeeded: boolean,
    tokenAddress: string,
    spenderAddress: string,
    approvalAmount: string,
    mainTransaction: () => Promise<string>
  ) => {
    try {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected');
      }

      const { writeContract } = await import('wagmi/actions');
      const { config } = await import('../providers/MiniKitProvider');

      // 1. Handle approval if needed (with reasonable approval amount)
      if (approvalNeeded) {
        console.log('📝 Setting reasonable approval to avoid security warnings...');

        const erc20ABI = [
          {
            name: 'approve',
            type: 'function',
            inputs: [
              { name: 'spender', type: 'address' },
              { name: 'amount', type: 'uint256' }
            ],
            outputs: [{ name: '', type: 'bool' }],
            stateMutability: 'nonpayable'
          }
        ];

        // Use 10x the needed amount instead of unlimited to avoid security warnings
        const reasonableAmount = ethers.BigNumber.from(approvalAmount).mul(10);

        const approvalHash = await writeContract(config, {
          address: tokenAddress as `0x${string}`,
          abi: erc20ABI,
          functionName: 'approve',
          args: [spenderAddress as `0x${string}`, BigInt(reasonableAmount.toString())],
        });

        console.log('✅ Reasonable approval transaction sent:', approvalHash);
      }

      // 2. Execute main transaction
      const mainHash = await mainTransaction();
      console.log('✅ Main transaction completed:', mainHash);

      return {
        success: true,
        hash: mainHash
      };

    } catch (error: any) {
      console.error('❌ Optimized transaction failed:', error);
      throw error;
    }
  }, [isConnected, address]);

  const executeBatchedSwapWithFee = useCallback(async (
    _fromTokenAddress: string,
    _toTokenAddress: string,
    _amountIn: string,
    _amountOutMin: string,
    _userAddress: string,
    _deadline: number,
    _feeInfo: any
  ): Promise<{ success: boolean; hash: string }> => {
    throw new Error('Swap removed - handled by Farcaster');
  }, []);

  const _removedSwapFn = useCallback(async (
    fromTokenAddress: string,
    toTokenAddress: string,
    amountIn: string,
    amountOutMin: string,
    userAddress: string,
    deadline: number
  ): Promise<{ success: boolean; hash: string }> => {
    throw new Error('Swap removed');
      }, [isConnected, address]);
  void _removedSwapFn;

  // Farcaster-compatible token approval using wagmi/actions
  const executeFarcasterApproval = useCallback(async (
    tokenAddress: string,
    spenderAddress: string,
    amount: string
  ): Promise<{ success: boolean; hash: string }> => {
    try {
      console.log('🔐 Executing Farcaster token approval:', {
        token: tokenAddress,
        spender: spenderAddress,
        amount
      });

      if (!isConnected || !address) {
        throw new Error('Wallet not connected in Farcaster');
      }

      // Use wagmi's writeContract approach for Farcaster MiniApps
      const { writeContract } = await import('wagmi/actions');
      const { config } = await import('../providers/MiniKitProvider');

      const hash = await writeContract(config, {
        address: tokenAddress as `0x${string}`,
        abi: [
          {
            name: 'approve',
            type: 'function',
            inputs: [
              { name: 'spender', type: 'address' },
              { name: 'amount', type: 'uint256' }
            ],
            outputs: [{ name: '', type: 'bool' }],
            stateMutability: 'nonpayable'
          }
        ],
        functionName: 'approve',
        args: [spenderAddress as `0x${string}`, BigInt(amount)]
      });

      console.log('✅ Farcaster approval transaction sent:', hash);

      return {
        success: true,
        hash: hash
      };
    } catch (error: any) {
      console.error('❌ Farcaster approval failed:', error);

      if (error?.message?.includes('user rejected') || error?.message?.includes('denied')) {
        throw new Error('Approval was cancelled by user');
      }

      throw new Error(`Farcaster approval failed: ${error?.message || 'Unknown error'}`);
    }
  }, [isConnected, address]);

  // Farcaster-compatible token transfer using wagmi/actions
  const executeFarcasterTransfer = useCallback(async (
    tokenAddress: string,
    toAddress: string,
    amount: string
  ): Promise<{ success: boolean; hash: string }> => {
    try {
      console.log('💳 Executing Farcaster token transfer:', {
        token: tokenAddress,
        to: toAddress,
        amount
      });

      if (!isConnected || !address) {
        throw new Error('Wallet not connected in Farcaster');
      }

      // Use wagmi's writeContract approach for Farcaster MiniApps
      const { writeContract } = await import('wagmi/actions');
      const { config } = await import('../providers/MiniKitProvider');

      const hash = await writeContract(config, {
        address: tokenAddress as `0x${string}`,
        abi: [
          {
            name: 'transfer',
            type: 'function',
            inputs: [
              { name: 'to', type: 'address' },
              { name: 'amount', type: 'uint256' }
            ],
            outputs: [{ name: '', type: 'bool' }],
            stateMutability: 'nonpayable'
          }
        ],
        functionName: 'transfer',
        args: [
          toAddress as `0x${string}`,
          BigInt(amount)
        ]
      });

      console.log('✅ Farcaster transfer transaction sent:', hash);

      return {
        success: true,
        hash: hash
      };
    } catch (error: any) {
      console.error('❌ Farcaster transfer failed:', error);

      if (error?.message?.includes('user rejected') || error?.message?.includes('denied')) {
        throw new Error('Transfer was cancelled by user');
      }

      throw new Error(`Farcaster transfer failed: ${error?.message || 'Unknown error'}`);
    }
  }, [isConnected, address]);

  const executePaycrestTransaction = useCallback(async (currency: 'local' | 'usdc', amount: string, recipient: any, flowType: 'send' | 'pay' = 'pay') => {
    if (!walletAddress || !isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      // Calculate the correct amount and rate
      const rate = parseFloat(currentRate);
      const amountNum = parseFloat(amount);

      // For local currency, amount is in local currency; for USDC, amount is in USDC
      const paymentAmount = currency === 'local' ? amountNum : amountNum;

      // Determine network and token based on selected token and flow type
      // Use selectedPayToken for Pay flow, selectedSendToken for Send flow
      const selectedTokenData = stablecoins.find(token =>
        token.baseToken === (flowType === 'send' ? selectedSendToken : selectedPayToken)
      );

      console.log('🔍 All stablecoins:', stablecoins.map(s => ({ baseToken: s.baseToken, chainId: s.chainId })));
      console.log('🔍 Looking for token:', flowType === 'send' ? selectedSendToken : selectedPayToken);
      console.log('🔍 Found token data:', selectedTokenData);

      // Ensure proper network detection based on token type
      let network: 'base' | 'celo' = 'base'; // Default to base
      let token: 'USDC' | 'USDT' | 'cUSD' = 'USDC'; // Default to USDC

      if (selectedTokenData) {
        token = selectedTokenData.baseToken as 'USDC' | 'USDT' | 'cUSD';
        // USDT and cUSD are on Celo (chainId: 42220), USDC is on Base (chainId: 8453)
        if (token === 'USDT' || token === 'cUSD') {
          network = 'celo';
        } else if (token === 'USDC') {
          network = 'base';
        } else {
          // For other tokens, use chainId
          network = selectedTokenData.chainId === 42220 ? 'celo' : 'base';
        }
      }

      // Prepare Paycrest API payload (same as main app)
      const paymentOrderPayload = {
        amount: paymentAmount,
        rate: rate,
        network: network as 'base' | 'celo',
        token: token as 'USDC' | 'USDT' | 'cUSD',
        recipient: recipient,
        returnAddress: walletAddress,
        reference: `miniapp-${Date.now()}`
      };

      console.log('🔍 Debug - Selected Token Data:', selectedTokenData);
      console.log('🔍 Debug - Currency:', currency);
      console.log('🔍 Debug - Selected Send Token:', selectedSendToken);
      console.log('🔍 Debug - Network:', network);
      console.log('🔍 Debug - Token:', token);
      console.log('🔍 Debug - Chain ID:', selectedTokenData?.chainId);
      console.log('Initiating Paycrest payment order:', paymentOrderPayload);

      // Call Paycrest API (same as main app)
      const response = await fetch('/api/paycrest/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentOrderPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);

        let userFriendlyMessage = 'Unknown error';

        try {
          const errorData = JSON.parse(errorText);
          userFriendlyMessage = errorData.message || 'Unknown error';
        } catch (parseError) {
          // If JSON parsing fails, use the raw error text
          console.error('Failed to parse error JSON:', parseError);
          userFriendlyMessage = errorText || 'Unknown error';
        }

        // Parse and provide user-friendly error messages
        const lowerMessage = userFriendlyMessage.toLowerCase();

        // Check for specific error types
        // Check for route/provider availability issues first (before generic "missing fields")
        if (lowerMessage.includes('route not found') ||
          lowerMessage.includes('no route') ||
          lowerMessage.includes('route unavailable') ||
          lowerMessage.includes('provider does not support') ||
          lowerMessage.includes('institution code') ||
          lowerMessage.includes('institution not found') ||
          lowerMessage.includes('invalid request') ||
          (lowerMessage.includes('missing') && lowerMessage.includes('institution')) ||
          (response.status === 400 && !lowerMessage.includes('phone') && !lowerMessage.includes('amount'))) {
          userFriendlyMessage = `This provider does not support ${token} payments to the selected destination. Please try a different provider or token.`;
        } else if (lowerMessage.includes('provider not supported') ||
          lowerMessage.includes('institution not supported') ||
          lowerMessage.includes('not available for')) {
          userFriendlyMessage = `This provider is not currently supported for ${token} transactions. Please try a different provider or token.`;
        } else if (lowerMessage.includes('missing required fields') ||
          lowerMessage.includes('required field')) {
          userFriendlyMessage = `Please fill in all required fields (recipient name, phone number, and amount)`;
        } else if (lowerMessage.includes('invalid phone number') ||
          lowerMessage.includes('invalid account') ||
          lowerMessage.includes('invalid mobile')) {
          userFriendlyMessage = `Invalid phone number format. Please check and try again.`;
        } else if (lowerMessage.includes('insufficient liquidity') ||
          lowerMessage.includes('amount too high') ||
          lowerMessage.includes('exceeds maximum')) {
          userFriendlyMessage = `Transaction amount is too high. Please try a smaller amount.`;
        } else if (lowerMessage.includes('rate') && !lowerMessage.includes('separate')) {
          userFriendlyMessage = `Unable to get exchange rate. Please try again in a moment.`;
        } else if (lowerMessage.includes('network') && !lowerMessage.includes('switch')) {
          userFriendlyMessage = `Network error. Please check your connection and try again.`;
        } else if (lowerMessage.includes('token not supported') ||
          lowerMessage.includes('currency not supported')) {
          userFriendlyMessage = `${token} is not supported for this transaction. Please select a different token.`;
        } else if (response.status === 404) {
          userFriendlyMessage = `Service not available. Please contact support.`;
        } else if (response.status === 500) {
          userFriendlyMessage = `Server error. Please try again later.`;
        }

        throw new Error(`Paycrest API error: ${userFriendlyMessage}`);
      }

      const responseText = await response.text();
      console.log('📝 Raw API Response:', responseText);

      let paymentOrder;
      try {
        paymentOrder = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError);
        console.error('❌ Response text that failed to parse:', responseText);
        throw new Error('Invalid response from server');
      }
      console.log('Paycrest payment order created:', paymentOrder);

      // Now execute the actual blockchain transaction
      if (!paymentOrder.data?.receiveAddress) {
        throw new Error('No receive address received from Paycrest');
      }

      console.log('Executing blockchain transaction to:', paymentOrder.data.receiveAddress);

      // Calculate token amount based on selected token
      const tokenAmount = currency === 'local' ? (paymentAmount / rate).toFixed(selectedTokenData?.decimals || 6) : paymentAmount.toFixed(selectedTokenData?.decimals || 6);

      // Execute the blockchain transaction - handle walletClient being null
      console.log('🔍 Wallet state debug:', {
        isConnected,
        address,
        walletClient: !!walletClient,
        walletClientAccount: walletClient?.account?.address,
        walletClientChain: walletClient?.chain?.name,
        connectors: connectors?.map(c => c.name),
        hasWindowEthereum: !!(window as any).ethereum
      });

      if (!isConnected) {
        throw new Error('Wallet not connected');
      }

      if (!address) {
        throw new Error('No wallet address found');
      }

      // Simple wallet provider detection: use smart wallet if no window.ethereum but wallet is connected
      console.log('🔍 Wallet detection:', {
        hasWindowEthereum: !!(window as any).ethereum,
        isConnected,
        address,
        userAgent: navigator.userAgent.substring(0, 100)
      });

      if ((window as any).ethereum) {
        // Use window.ethereum (MetaMask, Coinbase Wallet, etc.)
        const walletProvider = (window as any).ethereum;
        console.log('✅ Using window.ethereum provider');

        const blockchainResult = await executeTokenTransaction(
          paymentOrder.data.receiveAddress,
          parseFloat(tokenAmount),
          walletProvider,
          selectedTokenData
        );

        if (!blockchainResult.success) {
          throw new Error('Blockchain transaction failed');
        }

        return {
          success: true,
          orderId: paymentOrder.data?.id || 'unknown',
          paymentOrder: paymentOrder,
          amount: tokenAmount,
          hash: blockchainResult.hash
        };
      } else if (isConnected && address) {
        // No window.ethereum but wallet is connected - use smart wallet approach
        console.log('✅ Using smart wallet transaction (no window.ethereum)');
        const farcasterResult = await executeFarcasterTransaction(
          paymentOrder.data.receiveAddress,
          parseFloat(tokenAmount),
          selectedTokenData
        );

        return {
          success: true,
          orderId: paymentOrder.data?.id || 'unknown',
          paymentOrder: paymentOrder,
          amount: tokenAmount,
          hash: farcasterResult.hash
        };
      } else {
        console.error('❌ No wallet available');
        throw new Error('Please connect your wallet first');
      }
    } catch (error: any) {
      console.error('Paycrest transaction failed:', error);
      throw error;
    }
  }, [walletAddress, isConnected, currentRate, selectedSendToken, selectedPayToken, stablecoins]);

  // Farcaster sharing functionality
  const handleShareOnFarcaster = useCallback((paymentLink: string) => {
    try {
      // Create shareable text for Farcaster
      const shareText = `💰 ${linkDescription || 'Payment Request'} - $${linkAmount || '0'} ${selectedStablecoin.baseToken}\n\nPay instantly with NedaPay! 🚀`;

      // Try to use Farcaster's native sharing if available
      if (typeof window !== 'undefined' && (window as any).parent) {
        // Post message to parent frame (Farcaster client)
        (window as any).parent.postMessage({
          type: 'createCast',
          data: {
            text: shareText,
            embeds: [paymentLink] // Use the direct payment link with embedded metadata
          }
        }, '*');

        alert('🚀 Shared to Farcaster! The payment link will display with a rich preview and open directly in NedaPay.');
      } else {
        // Fallback: Copy share text and link to clipboard
        const fullShareText = `${shareText}\n\n${paymentLink}`;
        navigator.clipboard.writeText(fullShareText).then(() => {
          alert('💰 Share text copied to clipboard!\n\nPaste it in Farcaster to share your payment link with a rich preview.');
        });
      }
    } catch (error) {
      console.error('Failed to share on Farcaster:', error);
      // Fallback: Copy link to clipboard
      navigator.clipboard.writeText(paymentLink).then(() => {
        alert('Payment link copied to clipboard!');
      });
    }
  }, [linkAmount, linkDescription, selectedStablecoin]);

  // Fetch Pretium networks and countries for deposit tab
  useEffect(() => {
    const fetchPretiumNetworks = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_NEDAPAY_API_KEY;
        const response = await fetch('https://api.nedapay.xyz/api/v1/ramp/pretium/networks', {
          headers: {
            'x-api-key': apiKey || '',
          },
        });
        const data = await response.json();
        if (data.status === 'success' && data.data) {
          setPretiumNetworks(data.data.networks || {});
          setPretiumCountries(data.data.countries || {});
          setPretiumCurrencies(data.data.currencies || []);
        }
      } catch (error) {
        console.error('Failed to fetch Pretium networks:', error);
      }
    };

    fetchPretiumNetworks();
  }, []);

  // Fetch exchange rate when country changes
  useEffect(() => {
    if (!depositCountry) return;

    const fetchExchangeRate = async () => {
      setDepositLoadingRate(true);
      try {
        const currencyMapping: Record<string, string> = {
          'MW': 'MWK',
          'CD': 'CDF',
          'ET': 'ETB',
          'KE': 'KES',
          'GH': 'GHS',
          'UG': 'UGX',
        };
        const currencyCode = currencyMapping[depositCountry];

        const apiKey = process.env.NEXT_PUBLIC_NEDAPAY_API_KEY;
        const response = await fetch('https://api.nedapay.xyz/api/v1/ramp/pretium/exchange-rate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey || '',
          },
          body: JSON.stringify({ currency_code: currencyCode }),
        });

        const data = await response.json();
        if (data.status === 'success' && data.data) {
          setDepositExchangeRate(data.data.quoted_rate || null);
        }
      } catch (error) {
        console.error('Failed to fetch exchange rate:', error);
      } finally {
        setDepositLoadingRate(false);
      }
    };

    fetchExchangeRate();
  }, [depositCountry]);

  // Handle deposit (on-ramp) submission
  const handleDeposit = async () => {
    if (!depositAmount || !depositCountry || !depositNetwork || !depositPhone || !walletAddress) {
      alert('Please fill in all fields and connect your wallet');
      return;
    }

    setDepositLoading(true);
    setDepositStatus(null);

    try {
      // Get currency code for the selected country
      const currencyMapping: Record<string, string> = {
        'MW': 'MWK',
        'CD': 'CDF',
        'ET': 'ETB',
        'KE': 'KES',
        'GH': 'GHS',
        'UG': 'UGX',
      };
      const currencyCode = currencyMapping[depositCountry] || 'KES';

      const apiKey = process.env.NEXT_PUBLIC_NEDAPAY_API_KEY;
      const response = await fetch('https://api.nedapay.xyz/api/v1/ramp/pretium/onramp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey || '',
        },
        body: JSON.stringify({
          currency_code: currencyCode,
          shortcode: depositPhone,
          amount: Number(depositAmount),
          mobile_network: depositNetwork,
          chain: depositChain,
          asset: depositAsset,
          address: walletAddress,
        }),
      });

      const data = await response.json();

      if (data.status === 'success' && data.data) {
        setDepositTransactionCode(data.data.transaction_code);
        setDepositStatus('STK push sent! Check your phone to complete the payment.');
        setDepositStep(4);
      } else {
        setDepositStatus(data.message || 'Failed to initiate deposit');
      }
    } catch (error: any) {
      console.error('Deposit error:', error);
      setDepositStatus(error.message || 'Network error occurred');
    } finally {
      setDepositLoading(false);
    }
  };

  // Poll deposit status
  const pollDepositStatus = useCallback(async () => {
    if (!depositTransactionCode || !depositCountry) return;

    setDepositPolling(true);
    try {
      const currencyMapping: Record<string, string> = {
        'MW': 'MWK',
        'CD': 'CDF',
        'ET': 'ETB',
        'KE': 'KES',
        'GH': 'GHS',
        'UG': 'UGX',
      };
      const currencyCode = currencyMapping[depositCountry];

      const apiKey = process.env.NEXT_PUBLIC_NEDAPAY_API_KEY;
      const response = await fetch('https://api.nedapay.xyz/api/v1/ramp/pretium/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey || '',
        },
        body: JSON.stringify({
          currency_code: currencyCode,
          transaction_code: depositTransactionCode,
        }),
      });

      const data = await response.json();

      if (data.status === 'success' && data.data) {
        const statusUpper = String(data.data.status || '').toUpperCase();

        if (statusUpper === 'COMPLETE' || statusUpper === 'COMPLETED' || statusUpper === 'SUCCESS') {
          setDepositStatus('✅ Deposit completed! Your crypto has been sent to your wallet.');
        } else if (statusUpper === 'FAILED' || statusUpper === 'FAIL') {
          setDepositStatus('❌ Payment failed. Please try again.');
        } else {
          setDepositStatus(`Status: ${data.data.status}`);
        }
      }
    } catch (error: any) {
      console.error('Status polling error:', error);
    } finally {
      setDepositPolling(false);
    }
  }, [depositTransactionCode, depositCountry]);

  // Auto-poll status when transaction code exists
  useEffect(() => {
    if (!depositTransactionCode) return;

    const interval = setInterval(() => {
      pollDepositStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [depositTransactionCode, pollDepositStatus]);

  const handleGeneratePaymentLink = useCallback(async () => {
    if (!linkAmount || !isWalletConnected || !walletAddress) {
      alert('Please connect wallet and enter amount');
      return;
    }

    try {
      // Generate a unique payment link
      const linkId = `payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const baseUrl = window.location.origin;

      // Calculate protocol fee if enabled
      let protocolFeeParams = '';
      if (isProtocolEnabled()) {
        const feeInfo = calculateDynamicFee(Number(linkAmount));
        protocolFeeParams = `&protocolFee=${feeInfo.feeRate}&feeTier=${encodeURIComponent(feeInfo.tier)}&protocolEnabled=true`;
      }

      // Create universal payment link
      const paymentLink = `${baseUrl}/payment-request?id=${linkId}&amount=${linkAmount}&token=${selectedStablecoin.baseToken}&description=${encodeURIComponent(linkDescription)}&merchant=${walletAddress}${protocolFeeParams}`;

      // Store payment request data
      const storedPaymentData = {
        id: linkId,
        amount: linkAmount,
        token: selectedStablecoin.baseToken,
        description: linkDescription,
        merchant: walletAddress,
        createdAt: new Date().toISOString(),
        status: 'pending',
        protocolEnabled: isProtocolEnabled(),
        ...(isProtocolEnabled() && {
          protocolFee: calculateDynamicFee(Number(linkAmount))
        })
      };

      // Store in localStorage for now (in production, this would be stored in a database)
      localStorage.setItem(`payment-${linkId}`, JSON.stringify(storedPaymentData));

      // Set the generated link in state first to update UI
      setGeneratedLink(paymentLink);

      // Then copy to clipboard
      try {
        console.log('🔗 Copying payment link to clipboard:', paymentLink);

        // Try modern clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(paymentLink);
          // Don't show alert since UI will show the link
          return;
        }

        // Fallback to manual copy method
        console.log('📋 Using fallback copy method');

        // Create a temporary text area for copying
        const textArea = document.createElement('textarea');
        textArea.value = paymentLink;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);

          if (!successful) {
            // Show the link directly if copy failed
            prompt('Copy this payment link:', paymentLink);
          }
        } catch (copyError) {
          document.body.removeChild(textArea);
          // Show the link directly if all else fails
          prompt('Copy this payment link:', paymentLink);
        }

      } catch (error) {
        console.error('Copy error:', error);
        // Final fallback - show the link in a prompt
        prompt('Copy this payment link:', paymentLink);
      }

    } catch (error) {
      console.error('Failed to generate payment link:', error);
      alert(' Failed to generate payment link: ' + (error as Error).message);
    }
  }, [linkAmount, isConnected, walletAddress, selectedStablecoin, linkDescription]);

  const handleSendTransaction = useCallback(async () => {
    if (!amount || !phoneNumber) {
      alert('Please enter amount and phone number');
      return;
    }

    if (!walletAddress || !isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      // Ensure we're on the correct network before transaction
      if (isConnected && switchChain) {
        const isCeloToken = (selectedSendToken === 'USDT' || selectedSendToken === 'cUSD');
        const targetChainId = isCeloToken ? 42220 : 8453; // Celo : Base
        const networkName = isCeloToken ? 'Celo' : 'Base';

        try {
          console.log(`🔄 Switching to ${networkName} (${targetChainId}) for ${selectedSendToken} transaction`);
          await switchChain({ chainId: targetChainId });
          console.log(`✅ Successfully switched to ${networkName} for ${selectedSendToken} transaction`);

          // Wait a moment for chain switch to complete
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (error) {
          console.error(`❌ Chain switch to ${networkName} failed:`, error);
          // For Celo tokens, show a more specific error
          if (isCeloToken) {
            alert(`Failed to switch to Celo network for ${selectedSendToken}. Please manually switch to Celo network in your wallet.`);
            return;
          }
        }
      }

      // Show loading state
      setIsSwipeComplete(true);

      // Validate that institution is selected
      if (!selectedInstitution) {
        alert('Please select a mobile money or bank provider');
        return;
      }

      // Prepare recipient data for Paycrest API (correct format)
      // Determine account type based on selected institution
      const selectedInstitutionData = institutions.find(i => i.code === selectedInstitution);
      // console.log('🏦 Selected institution data:', selectedInstitutionData);
      // console.log('🏦 Institution type:', selectedInstitutionData?.type);
      const isBank = selectedInstitutionData?.type === 'bank';

      // Clean phone number/account number
      const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');

      // Only add country code for mobile money, not for banks
      let accountIdentifier;
      if (isBank) {
        // For banks, use the raw account number without country code
        accountIdentifier = cleanPhoneNumber;
      } else {
        // For mobile money, add country code if not already present
        const countryCodeNumber = selectedCountry.countryCode?.replace('+', '') || '';
        accountIdentifier = cleanPhoneNumber.startsWith(countryCodeNumber)
          ? cleanPhoneNumber
          : countryCodeNumber + cleanPhoneNumber;
      }

      const recipient = {
        institution: selectedInstitution,
        accountIdentifier: accountIdentifier,
        accountName: recipientName,
        memo: `Send ${sendCurrency === 'local' ? amount + ' ' + selectedCountry.currency : amount + ' ' + selectedSendToken} to ${accountIdentifier}`
      };

      // Execute Paycrest API transaction
      setIsConfirming(true); // Show confirming state
      const result = await executePaycrestTransaction(sendCurrency, amount, recipient, 'send');

      if (!result) {
        throw new Error('Transaction failed - no result returned');
      }

      setIsConfirming(false); // Hide confirming state

      // Transaction successful - show animated modal
      setSuccessData({
        orderId: result.orderId,
        hash: result.hash,
        amount: sendCurrency === 'local' ? `${amount} ${selectedCountry.currency}` : `${amount} ${selectedSendToken}`,
        recipient: phoneNumber,
        type: 'send',
        token: selectedSendToken as 'USDC' | 'USDT'
      });
      setShowSuccessModal(true);

      // Add notification for successful send (with transaction data)
      addNotification(
        t('notifications.successfullySent', { amount, token: selectedSendToken, recipient: recipientName || phoneNumber }),
        'send',
        {
          hash: result.hash,
          amount: sendCurrency === 'local' ? `${amount} ${selectedCountry.currency}` : `${amount} ${selectedSendToken}`,
          currency: sendCurrency === 'local' ? selectedCountry.currency : selectedSendToken,
          recipient: recipientName || phoneNumber,
          orderId: result.orderId
        }
      );

      // Refresh balance
      await fetchWalletBalance();

    } catch (error: any) {
      console.error('Send transaction failed:', error);
      setIsConfirming(false); // Hide confirming state on error
      setIsSwipeComplete(false);
      setSwipeProgress(0);

      // Parse error message and provide user-friendly feedback
      let errorTitle = 'Transaction Failed';
      let errorMessage = error.message || 'Unknown error occurred';
      let suggestion = '';

      if (errorMessage.includes('Paycrest API error')) {
        errorMessage = errorMessage.replace('Paycrest API error: ', '');

        // Provide specific suggestions based on error type
        if (errorMessage.includes('does not support') && errorMessage.includes('payments to')) {
          errorTitle = 'Route Not Available';
          suggestion = 'This provider does not offer this payment route. Try selecting a different provider (like a mobile money service) or use a different token like USDC/USDT.';
        } else if (errorMessage.includes('provider is not currently supported')) {
          errorTitle = 'Provider Not Supported';
          suggestion = 'Try selecting a different mobile money provider or use a different cryptocurrency token.';
        } else if (errorMessage.includes('fill in all required fields')) {
          errorTitle = 'Missing Information';
          suggestion = 'Please ensure you have entered the recipient name, phone number, and amount.';
        } else if (errorMessage.includes('Invalid phone number')) {
          errorTitle = 'Invalid Phone Number';
          suggestion = 'Please check the phone number format and ensure it includes the correct country code.';
        } else if (errorMessage.includes('amount is too high')) {
          errorTitle = 'Amount Too High';
          suggestion = 'Try sending a smaller amount or split the transaction into multiple payments.';
        } else if (errorMessage.includes('Network error')) {
          errorTitle = 'Connection Issue';
          suggestion = 'Check your internet connection and try again.';
        }
      } else if (errorMessage.includes('switch to Celo network')) {
        errorTitle = 'Network Switch Required';
        suggestion = 'Please switch your wallet to the Celo network to complete this transaction.';
      } else if (errorMessage.includes('Wallet not connected')) {
        errorTitle = 'Wallet Not Connected';
        suggestion = 'Please connect your wallet to continue.';
      }

      setErrorData({
        title: errorTitle,
        message: errorMessage,
        suggestion: suggestion
      });
      setShowErrorModal(true);
    } finally {
      setIsSwipeComplete(false);
      setSwipeProgress(0);
    }
  }, [amount, phoneNumber, walletAddress, isConnected, sendCurrency, selectedSendToken, selectedCountry.currency, selectedCountry.code, selectedInstitution, executePaycrestTransaction, fetchWalletBalance, switchChain, t, addNotification, recipientName]);

  const handlePayTransaction = useCallback(async () => {
    if (!amount || !tillNumber) {
      alert('Please enter amount and till number');
      return;
    }

    // Additional validation for paybill
    if (paymentType === 'bill' && !businessNumber) {
      alert('Please enter business number for paybill');
      return;
    }

    if (!walletAddress || !isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      // Ensure we're on the correct network before transaction
      if (isConnected && switchChain) {
        const isCeloToken = (selectedPayToken === 'USDT' || selectedPayToken === 'cUSD');
        const targetChainId = isCeloToken ? 42220 : 8453; // Celo : Base
        const networkName = isCeloToken ? 'Celo' : 'Base';

        try {
          console.log(`🔄 Switching to ${networkName} (${targetChainId}) for ${selectedPayToken} transaction`);
          await switchChain({ chainId: targetChainId });
          console.log(`✅ Successfully switched to ${networkName} for ${selectedPayToken} transaction`);

          // Wait a moment for chain switch to complete
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (error) {
          console.error(`❌ Chain switch to ${networkName} failed:`, error);
          // For Celo tokens, show a more specific error
          if (isCeloToken) {
            alert(`Failed to switch to Celo network for ${selectedPayToken}. Please manually switch to Celo network in your wallet.`);
            return;
          }
        }
      }

      // Show loading state
      setIsSwipeComplete(true);

      // Validate that institution is selected for payments
      if (!selectedInstitution) {
        alert('Please select a payment provider');
        return;
      }

      // Prepare recipient data for Paycrest API (correct format)
      // Clean till/business number and check if it already includes country code
      const cleanTillNumber = tillNumber.replace(/\D/g, '');
      const countryCodeNumber = selectedCountry.countryCode?.replace('+', '') || '';

      // Check if till number already starts with country code (for mobile numbers)
      const formattedTillNumber = cleanTillNumber.startsWith(countryCodeNumber)
        ? cleanTillNumber
        : (cleanTillNumber.length > 6 ? countryCodeNumber + cleanTillNumber : cleanTillNumber);

      const recipient = {
        institution: selectedInstitution, // Use actual selected institution
        accountIdentifier: paymentType === 'bill' ? businessNumber : formattedTillNumber,
        accountName: paymentType === 'bill' ? 'Paybill Payment' : 'Till Payment',
        memo: `Pay ${payCurrency === 'local' ? amount + ' ' + selectedCountry.currency : amount + ' ' + selectedPayToken} to ${paymentType === 'bill' ? 'paybill ' + tillNumber + ' account ' + businessNumber : 'till ' + tillNumber}`
      };

      // Execute Paycrest API transaction
      setIsConfirming(true); // Show confirming state
      const result = await executePaycrestTransaction(payCurrency, amount, recipient, 'pay');

      if (!result) {
        throw new Error('Transaction failed - no result returned');
      }

      setIsConfirming(false); // Hide confirming state

      // Transaction successful - show animated modal
      setSuccessData({
        orderId: result.orderId,
        hash: result.hash,
        amount: payCurrency === 'local' ? `${amount} ${selectedCountry.currency}` : `${amount} ${selectedPayToken}`,
        recipient: paymentType === 'bill' ? businessNumber : tillNumber,
        type: 'pay',
        token: selectedPayToken as 'USDC' | 'USDT'
      });
      setShowSuccessModal(true);

      // Add notification for successful payment (with transaction data)
      addNotification(
        t('notifications.successfullyPaid', { amount, token: selectedPayToken, recipient: recipientName || (paymentType === 'bill' ? 'paybill' : 'till'), tillNumber }),
        'pay',
        {
          hash: result.hash,
          amount: payCurrency === 'local' ? `${amount} ${selectedCountry.currency}` : `${amount} ${selectedPayToken}`,
          currency: payCurrency === 'local' ? selectedCountry.currency : selectedPayToken,
          recipient: paymentType === 'bill' ? businessNumber : tillNumber,
          orderId: result.orderId
        }
      );

      // Refresh balance
      await fetchWalletBalance();

    } catch (error: any) {
      console.error('Pay transaction failed:', error);
      setIsConfirming(false); // Hide confirming state on error

      // Parse error message and provide user-friendly feedback
      let errorTitle = 'Payment Failed';
      let errorMessage = error.message || 'Unknown error occurred';
      let suggestion = '';

      if (errorMessage.includes('Paycrest API error')) {
        errorMessage = errorMessage.replace('Paycrest API error: ', '');

        // Provide specific suggestions based on error type
        if (errorMessage.includes('does not support') && errorMessage.includes('payments to')) {
          errorTitle = 'Route Not Available';
          suggestion = 'This provider does not offer this payment route. Try selecting a different provider (like a mobile money service) or use a different token like USDC/USDT.';
        } else if (errorMessage.includes('provider is not currently supported')) {
          errorTitle = 'Provider Not Supported';
          suggestion = 'Try selecting a different payment provider or use a different cryptocurrency token.';
        } else if (errorMessage.includes('fill in all required fields')) {
          errorTitle = 'Missing Information';
          suggestion = 'Please ensure you have entered the till number, business number (if paybill), and amount.';
        } else if (errorMessage.includes('Invalid phone number') || errorMessage.includes('Invalid till')) {
          errorTitle = 'Invalid Till/Paybill Number';
          suggestion = 'Please check the till or paybill number format and try again.';
        } else if (errorMessage.includes('amount is too high')) {
          errorTitle = 'Amount Too High';
          suggestion = 'Try paying a smaller amount or split the payment into multiple transactions.';
        } else if (errorMessage.includes('Network error')) {
          errorTitle = 'Connection Issue';
          suggestion = 'Check your internet connection and try again.';
        }
      } else if (errorMessage.includes('switch to Celo network')) {
        errorTitle = 'Network Switch Required';
        suggestion = 'Please switch your wallet to the Celo network to complete this payment.';
      } else if (errorMessage.includes('Wallet not connected')) {
        errorTitle = 'Wallet Not Connected';
        suggestion = 'Please connect your wallet to continue.';
      }

      setErrorData({
        title: errorTitle,
        message: errorMessage,
        suggestion: suggestion
      });
      setShowErrorModal(true);
    } finally {
      setIsSwipeComplete(false);
      setSwipeProgress(0);
    }
  }, [amount, tillNumber, businessNumber, paymentType, walletAddress, isConnected, payCurrency, selectedPayToken, selectedCountry.currency, selectedCountry.code, executePaycrestTransaction, fetchWalletBalance, switchChain, t, addNotification, recipientName, selectedInstitution]);

  const renderSendTab = () => {
    const isPretiumCountry = ['GH', 'CD', 'MW'].includes(selectedCountry.code);

    // ── Step 1: Amount + Destination (combined, like main app) ─────────────
    if (sendStep === 'country') {
      return (
        <div className="flex flex-col space-y-3">
          <h2 className="text-[#1C1917] text-base font-semibold">{t('send.title')}</h2>

          {/* Amount card */}
          <div className="bg-[#F4EFE6] border border-[#D4CEBE] rounded-2xl p-4">
            <div className="text-[11px] font-medium text-[#7C7468] mb-3">You&apos;re sending</div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="bg-transparent text-[#1C1917] text-3xl font-semibold tracking-tight flex-1 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-[#C8C1B4]"
              />
              <div className="relative">
                <button
                  onClick={() => setShowSendTokenDropdown(!showSendTokenDropdown)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#EDE8DF] hover:bg-[#E8E2D9] rounded-xl transition-colors border border-[#C8C1B4]/50"
                >
                  {renderTokenIcon(stablecoins.find(token => token.baseToken === selectedSendToken) || stablecoins[0], "w-4 h-4")}
                  <span className="text-[#1C1917] text-sm font-semibold">{selectedSendToken}</span>
                  <ChevronDownIcon className="w-3.5 h-3.5 text-[#7C7468]" />
                </button>
                {showSendTokenDropdown && (
                  <div className="absolute top-full right-0 mt-2 bg-[#F4EFE6] rounded-xl border border-[#C8C1B4] shadow-xl z-50 min-w-[120px]">
                    {stablecoins.map((token, index) => (
                      <button
                        key={`${token.baseToken}-${token.chainId}-${index}`}
                        onClick={async () => {
                          setSelectedSendToken(token.baseToken);
                          setSelectedToken(token);
                          setShowSendTokenDropdown(false);
                          if (isConnected && switchChain) {
                            try {
                              const isCelo = token.baseToken === 'USDT' || token.baseToken === 'cUSD';
                              await switchChain({ chainId: isCelo ? 42220 : 8453 });
                              setTimeout(() => fetchWalletBalance(token.baseToken), 1000);
                            } catch (error) { console.error('Chain switch failed:', error); }
                          }
                        }}
                        className="w-full px-3 py-2.5 text-left hover:bg-[#E4DDD3] flex items-center gap-2 text-xs transition-colors first:rounded-t-xl last:rounded-b-xl"
                      >
                        {renderTokenIcon(token, "w-3 h-3")}
                        <span className="text-[#1C1917]">{token.baseToken}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-[#7C7468] text-xs">{t('wallet.balance')}</span>
              <button onClick={() => setAmount(walletBalance)} className="text-blue-600 text-xs font-medium hover:text-blue-500 inline-flex items-center gap-1">
                {renderTokenIcon(stablecoins.find(t => t.baseToken === selectedSendToken) || stablecoins[0], "w-3 h-3")}
                {selectedSendToken} {walletBalance}
              </button>
            </div>
          </div>

          {/* Destination card */}
          <div className="bg-[#F4EFE6] border border-[#D4CEBE] rounded-2xl p-4">
            <div className="text-[11px] font-medium text-[#7C7468] mb-3">Destination</div>
            <div className="relative">
              <button
                onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                className="w-full h-12 flex items-center gap-2.5 bg-[#EDE8DF] border border-[#C8C1B4]/70 rounded-xl px-3 hover:bg-[#E8E2D9] transition-colors"
              >
                <span className="text-xl">{selectedCountry.flag}</span>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-[#1C1917] leading-none">{selectedCountry.name}</div>
                  <div className="text-[10px] text-[#7C7468] mt-0.5">{selectedCountry.currency}</div>
                </div>
                <ChevronDownIcon className={`w-4 h-4 text-[#7C7468] transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isCountryDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#F4EFE6] border border-[#C8C1B4] rounded-xl shadow-xl z-50 overflow-hidden max-h-52 overflow-y-auto">
                  {sendCountries.map((country) => (
                    <button
                      key={country.code}
                      onClick={() => { if (!country.comingSoon) { setSelectedCountry(country); setIsCountryDropdownOpen(false); } }}
                      disabled={country.comingSoon}
                      className={`w-full px-3 py-2.5 text-left flex items-center gap-2.5 transition-colors ${country.comingSoon ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#E4DDD3]'} ${selectedCountry.code === country.code ? 'bg-blue-500/10' : ''}`}
                    >
                      <span className="text-lg">{country.flag}</span>
                      <div className="flex-1">
                        <span className="text-[#1C1917] text-sm font-medium block">{country.name}</span>
                        <span className="text-[#7C7468] text-[10px]">{country.currency}{country.comingSoon ? ' · Coming soon' : ''}</span>
                      </div>
                      {selectedCountry.code === country.code && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Continue */}
          <button
            onClick={() => setSendStep('recipient')}
            disabled={!amount || parseFloat(amount) <= 0}
            className={`w-full h-14 font-semibold text-base rounded-2xl transition-all ${
              amount && parseFloat(amount) > 0
                ? 'bg-[#1C1917] text-white active:scale-[0.98]'
                : 'bg-[#E8E2D9] text-[#9B9188] cursor-not-allowed'
            }`}
          >
            Continue
          </button>
        </div>
      );
    }

    // ── Step 2: Recipient details ───────────────────────────────────────────
    if (sendStep === 'recipient') {
      if (isPretiumCountry) {
        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setSendStep('country')} className="w-10 h-10 rounded-full border border-[#C8C1B4] flex items-center justify-center hover:bg-[#E8E2D9] transition-colors shrink-0">
                <ArrowLeftIcon className="w-5 h-5 text-[#1C1917]" />
              </button>
              <div>
                <h2 className="text-[#1C1917] text-base font-medium">Send Money</h2>
                <p className="text-[#7C7468] text-xs">{selectedCountry.flag} {selectedCountry.name}</p>
              </div>
            </div>
            <PretiumOffRampFlow country={selectedCountry} walletAddress={walletAddress || ''} onBack={() => setSendStep('country')} stablecoins={stablecoins} />
          </div>
        );
      }

      return (
        <div className="flex flex-col space-y-3">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button onClick={() => setSendStep('country')} className="w-10 h-10 rounded-full border border-[#C8C1B4] flex items-center justify-center hover:bg-[#E8E2D9] transition-colors shrink-0">
              <ArrowLeftIcon className="w-5 h-5 text-[#1C1917]" />
            </button>
            <div>
              <h2 className="text-[#1C1917] text-base font-medium">Recipient Details</h2>
              <p className="text-[#7C7468] text-xs">{selectedCountry.flag} {selectedCountry.name} · {amount} {selectedSendToken}</p>
            </div>
          </div>

          {/* Destination card with inline pickers */}
          <div className="bg-[#F4EFE6] border border-[#D4CEBE] rounded-2xl p-4 space-y-4">
            <div className="text-[11px] font-medium text-[#7C7468]">Recipient details</div>

            {/* Provider */}
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-2">{t('send.selectProvider')}</label>
              <div className="relative">
                <button
                  onClick={() => setShowProviderDropdown(!showProviderDropdown)}
                  disabled={isLoadingInstitutions}
                  className="w-full h-12 bg-[#EDE8DF] border border-[#C8C1B4]/70 text-[#1C1917] rounded-xl px-3 text-sm hover:bg-[#E8E2D9] transition-colors flex items-center justify-between disabled:opacity-50"
                >
                  <span className={selectedInstitution ? 'text-[#1C1917]' : 'text-[#9B9188]'}>
                    {isLoadingInstitutions ? 'Loading…' : selectedInstitution ? institutions.find(i => i.code === selectedInstitution)?.name : t('send.chooseProvider')}
                  </span>
                  <ChevronDownIcon className={`w-4 h-4 text-[#7C7468] transition-transform ${showProviderDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showProviderDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#F4EFE6] rounded-xl border border-[#C8C1B4] shadow-xl z-50 max-h-52 overflow-y-auto">
                    {institutions.filter(i => i.type === 'mobile_money').length > 0 && (
                      <>
                        <div className="px-3 py-2 text-[10px] font-semibold text-[#7C7468] bg-[#E2DCD0] sticky top-0">📱 Mobile Money</div>
                        {institutions.filter(i => i.type === 'mobile_money').map(inst => (
                          <button key={inst.code} onClick={() => { setSelectedInstitution(inst.code); setShowProviderDropdown(false); }}
                            className={`w-full px-3 py-2.5 text-left text-sm hover:bg-[#E4DDD3] flex items-center gap-2 transition-colors ${selectedInstitution === inst.code ? 'bg-blue-500/10 text-blue-700 font-medium' : 'text-[#1C1917]'}`}>
                            {inst.name}
                          </button>
                        ))}
                      </>
                    )}
                    {institutions.filter(i => i.type === 'bank').length > 0 && (
                      <>
                        <div className="px-3 py-2 text-[10px] font-semibold text-[#7C7468] bg-[#E2DCD0] sticky top-0">🏦 Banks</div>
                        {institutions.filter(i => i.type === 'bank').map(inst => (
                          <button key={inst.code} onClick={() => { setSelectedInstitution(inst.code); setShowProviderDropdown(false); }}
                            className={`w-full px-3 py-2.5 text-left text-sm hover:bg-[#E4DDD3] flex items-center gap-2 transition-colors ${selectedInstitution === inst.code ? 'bg-blue-500/10 text-blue-700 font-medium' : 'text-[#1C1917]'}`}>
                            {inst.name}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-2">Full Name</label>
              <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="John Doe"
                className="w-full h-12 bg-[#EDE8DF] border border-[#C8C1B4]/70 text-[#1C1917] rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C1917]/20 placeholder:text-[#9B9188]" />
            </div>

            {/* Phone / Account */}
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-2">
                {institutions.find(i => i.code === selectedInstitution)?.type === 'bank' ? 'Account Number' : 'Phone Number'}
              </label>
              <input type="text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder={institutions.find(i => i.code === selectedInstitution)?.type === 'bank' ? 'Enter account number' : selectedCountry.countryCode + '...'}
                className="w-full h-12 bg-[#EDE8DF] border border-[#C8C1B4]/70 text-[#1C1917] rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C1917]/20 placeholder:text-[#9B9188]" />
            </div>
          </div>

          <button
            onClick={() => setSendStep('confirm')}
            disabled={!selectedInstitution || !recipientName.trim() || !phoneNumber.trim()}
            className={`w-full h-14 font-semibold text-base rounded-2xl transition-all ${
              selectedInstitution && recipientName.trim() && phoneNumber.trim()
                ? 'bg-[#1C1917] text-white active:scale-[0.98]'
                : 'bg-[#E8E2D9] text-[#9B9188] cursor-not-allowed'
            }`}
          >
            Continue
          </button>
        </div>
      );
    }

    // ── Step 3: Confirm & Send ──────────────────────────────────────────────
    return (
      <div className="flex flex-col space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => setSendStep('recipient')} className="w-10 h-10 rounded-full border border-[#C8C1B4] flex items-center justify-center hover:bg-[#E8E2D9] transition-colors shrink-0">
            <ArrowLeftIcon className="w-5 h-5 text-[#1C1917]" />
          </button>
          <div className="flex-1">
            <h2 className="text-[#1C1917] text-base font-medium">Confirm & Send</h2>
            <p className="text-[#7C7468] text-xs">{selectedCountry.flag} {selectedCountry.name}</p>
          </div>
          <div className="flex items-center gap-1 bg-[#EAE4DC] rounded-lg px-2 py-1">
            {(() => { const isCelo = stablecoins.find(t => t.baseToken === selectedSendToken)?.baseToken === 'USDT' || stablecoins.find(t => t.baseToken === selectedSendToken)?.baseToken === 'cUSD'; return (<><img src={isCelo ? "/celo.png" : "/assets/logos/base-logo.jpg"} className="w-3.5 h-3.5 rounded-full" /><span className="text-[#1C1917] text-xs font-medium">{isCelo ? "Celo" : "Base"}</span></>); })()}
          </div>
        </div>

        {/* Summary card */}
        <div className="bg-[#F4EFE6] border border-[#D4CEBE] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-medium text-[#7C7468]">You&apos;re sending</span>
            <button onClick={() => setSendStep('country')} className="text-xs text-blue-600 font-medium hover:text-blue-500">Edit</button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#E8E2D9] rounded-full flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-[#1C1917]">{recipientName.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[#1C1917] font-semibold text-sm truncate">{recipientName}</p>
              <p className="text-[#7C7468] text-xs truncate">{phoneNumber} · {institutions.find(i => i.code === selectedInstitution)?.name}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[#1C1917] font-bold text-base">{amount || '0'}</p>
              <p className="text-[#7C7468] text-xs">{selectedSendToken}</p>
            </div>
          </div>
        </div>

        {/* Rate + fees */}
        <div className="bg-[#F4EFE6] border border-[#D4CEBE] rounded-2xl p-4 space-y-2">
          <div className="text-center text-xs font-semibold text-[#4A4540]">
            1 {selectedSendToken} = {isLoadingRate ? '…' : currentRate} {selectedCountry.currency}
          </div>
          {amount && (
            <div className="text-center text-xs text-[#7C7468]">
              ≈ {(parseFloat(amount || '0') * parseFloat(currentRate)).toFixed(2)} {selectedCountry.currency}
            </div>
          )}
          <div className="h-px bg-[#C8C1B4]/30 my-1" />
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-[#7C7468]">Total {selectedCountry.currency}</span><span className="text-[#1C1917] font-medium">{paymentDetails.totalLocal} {selectedCountry.currency}</span></div>
            <div className="flex justify-between"><span className="text-[#7C7468]">{t('send.fees')}</span><span className="text-[#1C1917] font-medium">{paymentDetails.fee} {selectedCountry.currency}</span></div>
            <div className="flex justify-between"><span className="text-[#7C7468]">Amount in {selectedSendToken}</span><span className="text-[#1C1917] font-medium">{paymentDetails.usdcAmount} {selectedSendToken}</span></div>
          </div>
        </div>

        {/* Swipe to Send */}
        <div>
          <div className="relative bg-[#1C1917] rounded-2xl p-1.5 overflow-hidden shadow-xl shadow-black/20 border border-black/10">
            <div className="absolute left-0 top-0 h-full bg-white/20 rounded-full transition-all duration-150" style={{ width: `${swipeProgress}%` }} />
            <div className="relative flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <ArrowRightIcon className="w-4 h-4 text-[#1C1917]" />
                </div>
                <span className="text-white font-bold text-sm flex items-center gap-2">
                  {isConfirming ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{t('send.confirming')}</>) : isSwipeComplete ? t('send.sending') : t('send.swipeToSend')}
                </span>
              </div>
              <span className="text-white text-sm font-bold">{amount || '0'} {selectedSendToken}</span>
            </div>
            <div className="absolute inset-0 cursor-pointer"
              onMouseDown={(e) => { e.preventDefault(); const rect = e.currentTarget.getBoundingClientRect(); const startX = e.clientX - rect.left; const move = (me: MouseEvent) => { const p = Math.min(Math.max(((me.clientX - rect.left - startX) / rect.width) * 100, 0), 100); setSwipeProgress(p); if (p >= 80) { setIsSwipeComplete(true); setTimeout(() => { handleSendTransaction(); setIsSwipeComplete(false); setSwipeProgress(0); }, 500); document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); } }; const up = () => { if (swipeProgress < 80) setSwipeProgress(0); document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); }; document.addEventListener('mousemove', move); document.addEventListener('mouseup', up); }}
              onTouchStart={(e) => { e.preventDefault(); const rect = e.currentTarget.getBoundingClientRect(); const startX = e.touches[0].clientX - rect.left; const move = (me: TouchEvent) => { me.preventDefault(); const p = Math.min(Math.max(((me.touches[0].clientX - rect.left - startX) / rect.width) * 100, 0), 100); setSwipeProgress(p); if (p >= 80) { setIsSwipeComplete(true); setTimeout(() => { handleSendTransaction(); setIsSwipeComplete(false); setSwipeProgress(0); }, 500); document.removeEventListener('touchmove', move); document.removeEventListener('touchend', end); } }; const end = () => { if (swipeProgress < 80) setSwipeProgress(0); document.removeEventListener('touchmove', move); document.removeEventListener('touchend', end); }; document.addEventListener('touchmove', move, { passive: false }); document.addEventListener('touchend', end); }}
            />
          </div>
          <p className="text-center mt-2 text-xs text-[#7C7468]">{t('send.refundWarning')}</p>
        </div>
      </div>
    );
  };

  // Success Modal Component
  const SuccessModal = () => {
    if (!showSuccessModal || !successData) return null;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-[#F4EFE6] to-[#E2D9C8] rounded-2xl p-6 max-w-sm w-full border border-[#D4CEBE] shadow-2xl animate-in zoom-in-95 duration-300">
          {/* Success Icon with Animation */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center animate-bounce">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Success Title */}
          <h2 className="text-xl font-bold text-[#1C1917] text-center mb-2">
            {successData.type === 'send' ? `💸 ${t('success.moneySent')}` : `💳 ${t('success.paymentComplete')}`}
          </h2>
          <p className="text-[#7C7468] text-center text-sm mb-6">
            {t('success.transactionSuccessful')}
          </p>

          {/* Transaction Details */}
          <div className="space-y-3 mb-6">
            <div className="bg-[#EAE4DC] rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[#7C7468] text-xs">{t('success.amount')}</span>
                <div className="flex items-center gap-2">
                  {successData.token === 'USDT' ? (
                    <img src="/usdt.png" alt="USDT" className="w-4 h-4" />
                  ) : (
                    <img src="/assets/logos/usdc-logo.png" alt="USDC" className="w-4 h-4" />
                  )}
                  <span className="text-[#1C1917] font-semibold">{successData.amount}</span>
                </div>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[#7C7468] text-xs">{successData.type === 'send' ? t('success.recipient') : t('success.tillNumber')}</span>
                <div className="flex flex-col items-end">
                  <div className="text-[#1C1917] font-mono text-sm">
                    {successData.recipient.startsWith('0x') ? (
                      <Identity address={successData.recipient as `0x${string}`} chain={base}>
                        <Name className="text-[#1C1917] font-mono text-sm">
                          {successData.recipient}
                        </Name>
                      </Identity>
                    ) : (
                      successData.recipient
                    )}
                  </div>
                  <span className="text-[#9B9188] text-xs">{recipientName || t('success.mobileMoney')}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#7C7468] text-xs">{t('success.orderId')}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(successData.orderId);
                    const btn = event?.target as HTMLElement;
                    const originalText = btn.textContent;
                    btn.textContent = t('success.copied');
                    setTimeout(() => {
                      btn.textContent = originalText;
                    }, 1000);
                  }}
                  className="text-blue-600 font-mono text-xs hover:text-blue-500 transition-colors cursor-pointer flex items-center gap-1"
                >
                  {successData.orderId.slice(0, 8)}...
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Blockchain Hash */}
            <div className="bg-[#EDE8DF] rounded-lg p-3 border border-blue-500/20">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-blue-600 text-xs font-medium">{t('success.blockchainTransaction')}</span>
                </div>
                {successData.hash && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(successData.hash!);
                      const btn = event?.target as HTMLElement;
                      const originalText = btn.textContent;
                      btn.textContent = t('success.copied');
                      setTimeout(() => {
                        btn.textContent = originalText;
                      }, 1000);
                    }}
                    className="text-blue-600 hover:text-blue-500 transition-colors cursor-pointer"
                    title="Copy transaction hash"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                )}
              </div>
              <p className="text-[#4A4540] font-mono text-xs break-all">
                {successData.hash ? `${successData.hash.slice(0, 20)}...${successData.hash.slice(-10)}` : 'Transaction completed'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowSuccessModal(false);
                setSuccessData(null);
                setAmount('');
                setPhoneNumber('');
                setTillNumber('');
                setBusinessNumber('');
              }}
              className="flex-1 bg-[#1C1917] hover:bg-[#2C2927] text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200"
            >
              ✨ {t('success.done')}
            </button>
            <button
              onClick={() => {
                if (successData.hash) {
                  navigator.clipboard.writeText(successData.hash);
                }
              }}
              className="bg-[#E8E2D9] hover:bg-[#E4DDD3] text-[#1C1917] font-medium py-3 px-4 rounded-xl transition-colors border border-[#C8C1B4]"
            >
              📋
            </button>
          </div>

          {/* Celebration Animation */}
          <div className="absolute -top-2 -right-2 text-2xl animate-bounce delay-300">
            🎉
          </div>
          <div className="absolute -top-1 -left-2 text-xl animate-bounce delay-500">
            ✨
          </div>
        </div>
      </div>
    );
  };

  // Error Modal Component
  const ErrorModal = () => {
    if (!showErrorModal || !errorData) return null;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-[#F4EFE6] to-[#E2D9C8] rounded-2xl p-6 max-w-md w-full border border-red-300/50 shadow-2xl animate-in zoom-in-95 duration-300">
          {/* Error Icon with Animation */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>

          {/* Error Title */}
          <h2 className="text-2xl font-bold text-center text-[#1C1917] mb-2">{errorData.title}</h2>

          {/* Error Details */}
          <div className="space-y-4 mb-6">
            {/* Error Message */}
            <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/30">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-[#1C1917] text-sm flex-1">{errorData.message}</p>
              </div>
            </div>

            {/* Suggestion */}
            {errorData.suggestion && (
              <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-blue-600 text-xs font-semibold mb-1">💡 Suggestion</p>
                    <p className="text-[#4A4540] text-sm">{errorData.suggestion}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={() => {
              setShowErrorModal(false);
              setErrorData(null);
            }}
            className="w-full bg-[#1C1917] hover:bg-[#2C2927] text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  };

  const renderPayTab = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-white text-lg font-medium">{t('pay.title')}</h2>
        <div className="flex items-center gap-2">
          {(() => {
            const selectedTokenData = stablecoins.find(token =>
              token.baseToken === (payCurrency === 'local' ? selectedPayToken : selectedPayToken)
            );
            const isCeloToken = selectedTokenData?.baseToken === 'USDT' || selectedTokenData?.baseToken === 'cUSD';
            return (
              <>
                <img
                  src={isCeloToken ? "/celo.png" : "/assets/logos/base-logo.jpg"}
                  alt={isCeloToken ? "Celo" : "Base"}
                  className="w-4 h-4 rounded-full"
                />
                <span className="text-white text-sm">{isCeloToken ? "Celo" : "Base"}</span>
              </>
            );
          })()}
        </div>
      </div>

      {/* Country Selector */}
      <div className="relative">
        <button
          onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
          className="w-full bg-slate-800/50 border border-slate-700/50 text-white rounded-lg px-3 py-3 text-left flex items-center justify-between hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{selectedCountry.flag}</span>
            <span className="text-white font-medium text-sm">{selectedCountry.name}</span>
          </div>
          <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''
            }`} />
        </button>

        {/* Dropdown Menu */}
        {isCountryDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden max-h-64">
            {payCountries.map((country) => (
              <button
                key={country.code}
                onClick={() => {
                  if (!country.comingSoon) {
                    setSelectedCountry(country);
                    setIsCountryDropdownOpen(false);
                  }
                }}
                disabled={country.comingSoon}
                className={`w-full px-3 py-2 text-left flex items-center gap-2 transition-colors ${country.comingSoon
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-slate-700'
                  } ${selectedCountry.code === country.code ? 'bg-blue-600/20' : ''
                  }`}
              >
                <span className="text-lg">{country.flag}</span>
                <div className="flex flex-col">
                  <span className="text-white font-medium text-sm">{country.name}</span>
                  {country.comingSoon && (
                    <span className="text-gray-400 text-xs">Coming soon</span>
                  )}
                </div>
                {selectedCountry.code === country.code && (
                  <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Institution Selection */}
      {/* Payment Provider - Custom Dropdown */}
      <div>
        <label className="block text-xs text-gray-300 font-medium mb-1">{t('pay.selectProvider')}</label>
        <div className="relative">
          <button
            onClick={() => setShowProviderDropdown(!showProviderDropdown)}
            disabled={isLoadingInstitutions}
            className="w-full bg-slate-800/50 border border-slate-700/50 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-slate-700/50 transition-colors flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2">
              {isLoadingInstitutions ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-gray-400">Loading providers...</span>
                </>
              ) : selectedInstitution ? (
                <>
                  {institutions.find(i => i.code === selectedInstitution)?.type === 'mobile_money' ? (
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  )}
                  <span className="text-white">{institutions.find(i => i.code === selectedInstitution)?.name}</span>
                </>
              ) : (
                <span className="text-gray-400">{t('send.chooseProvider')}</span>
              )}
            </div>
            <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${showProviderDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showProviderDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 rounded-lg border border-slate-600 shadow-xl z-50 max-h-64 overflow-y-auto">
              {/* Mobile Money Section */}
              {institutions.filter(i => i.type === 'mobile_money').length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 bg-slate-900/50 sticky top-0 z-10">
                    📱 Mobile Money
                  </div>
                  {institutions.filter(i => i.type === 'mobile_money').map((institution) => (
                    <button
                      key={institution.code}
                      onClick={() => {
                        setSelectedInstitution(institution.code);
                        setShowProviderDropdown(false);
                      }}
                      className={`w-full px-3 py-2.5 text-left hover:bg-slate-700 flex items-center gap-3 text-sm transition-colors ${selectedInstitution === institution.code ? 'bg-blue-600/20 border-l-2 border-blue-500' : ''
                        }`}
                    >
                      <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span className="text-white flex-1">{institution.name}</span>
                      {selectedInstitution === institution.code && (
                        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Banks Section */}
              {institutions.filter(i => i.type === 'bank').length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 bg-slate-900/50 sticky top-0 z-10">
                    🏦 Banks
                  </div>
                  {institutions.filter(i => i.type === 'bank').map((institution) => (
                    <button
                      key={institution.code}
                      onClick={() => {
                        setSelectedInstitution(institution.code);
                        setShowProviderDropdown(false);
                      }}
                      className={`w-full px-3 py-2.5 text-left hover:bg-slate-700 flex items-center gap-3 text-sm transition-colors ${selectedInstitution === institution.code ? 'bg-blue-600/20 border-l-2 border-blue-500' : ''
                        }`}
                    >
                      <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="text-white flex-1">{institution.name}</span>
                      {selectedInstitution === institution.code && (
                        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payment Type Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setPaymentType('goods')}
          className={`relative py-3 px-2 rounded-xl text-xs font-bold transition-all duration-300 ease-out border-2 overflow-hidden group ${paymentType === 'goods'
            ? 'bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 text-white border-emerald-400/60 shadow-2xl shadow-emerald-500/40 transform scale-105'
            : 'bg-slate-800/80 text-white hover:bg-slate-700/90 border-slate-600/50 hover:border-emerald-500/30 hover:scale-102 hover:shadow-xl hover:shadow-emerald-500/10 active:scale-95'
            }`}
        >
          {/* Animated background */}
          {paymentType === 'goods' && (
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-green-400/20 animate-pulse" />
          )}

          {/* Hover glow */}
          <div className={`absolute inset-0 rounded-2xl transition-all duration-300 ${paymentType === 'goods'
            ? 'opacity-100 bg-emerald-400/10'
            : 'opacity-0 group-hover:opacity-100 bg-emerald-400/5'
            }`} />

          <span className={`relative z-10 flex items-center transition-all duration-300 ${paymentType === 'goods' ? 'drop-shadow-lg' : 'group-hover:tracking-wide'
            }`}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {t('pay.buyGoods')}
          </span>

          {/* Active pulse indicator */}
          {paymentType === 'goods' && (
            <div className="absolute top-2 right-2 w-2 h-2 bg-emerald-300 rounded-full animate-ping" />
          )}
        </button>

        <button
          onClick={() => setPaymentType('bill')}
          className={`relative py-3 px-2 rounded-xl text-xs font-bold transition-all duration-300 ease-out border-2 overflow-hidden group ${paymentType === 'bill'
            ? 'bg-gradient-to-br from-blue-500 via-cyan-600 to-sky-700 text-white border-blue-400/60 shadow-2xl shadow-blue-500/40 transform scale-105'
            : 'bg-slate-800/80 text-white hover:bg-slate-700/90 border-slate-600/50 hover:border-blue-500/30 hover:scale-102 hover:shadow-xl hover:shadow-blue-500/10 active:scale-95'
            }`}
        >
          {/* Animated background */}
          {paymentType === 'bill' && (
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 animate-pulse" />
          )}

          {/* Hover glow */}
          <div className={`absolute inset-0 rounded-2xl transition-all duration-300 ${paymentType === 'bill'
            ? 'opacity-100 bg-blue-400/10'
            : 'opacity-0 group-hover:opacity-100 bg-blue-400/5'
            }`} />

          <span className={`relative z-10 flex items-center transition-all duration-300 ${paymentType === 'bill' ? 'drop-shadow-lg' : 'group-hover:tracking-wide'
            }`}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t('pay.payBill')}
          </span>

          {/* Active pulse indicator */}
          {paymentType === 'bill' && (
            <div className="absolute top-2 right-2 w-2 h-2 bg-blue-300 rounded-full animate-ping" />
          )}
        </button>
      </div>

      {/* Payment Type Specific Fields */}
      {paymentType === 'bill' ? (
        <>
          {/* Paybill Number */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">{t('pay.payBill')} Number</label>
            <div className="relative">
              <input
                type="text"
                value={tillNumber}
                onChange={(e) => setTillNumber(e.target.value)}
                placeholder={`Enter ${t('pay.payBill').toLowerCase()} number`}
                className="w-full bg-slate-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Business Number */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Business Number</label>
            <div className="relative">
              <input
                type="text"
                value={businessNumber}
                onChange={(e) => setBusinessNumber(e.target.value)}
                placeholder="Enter account number"
                className="w-full bg-slate-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </>
      ) : (
        /* Till Number for Buy Goods */
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">
            {paymentType === 'goods' ? t('pay.tillNumber') : t('pay.enterTillNumber')}
          </label>
          <div className="relative">
            <input
              type="text"
              value={tillNumber}
              onChange={(e) => setTillNumber(e.target.value)}
              placeholder={t('pay.enterTillNumber')}
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Amount Input with Currency Switching */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">{t('pay.enterAmount')}</label>
        <div className="bg-slate-700 rounded-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={payCurrency === 'local' ? '1000' : '1.5'}
              step={payCurrency === 'local' ? '1' : '0.01'}
              className="bg-transparent text-white text-base font-light flex-1 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <div className="relative">
              <button
                onClick={() => {
                  setPayCurrency('usdc');
                  setShowPayTokenDropdown(!showPayTokenDropdown);
                }}
                className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-600/50 hover:bg-slate-600 rounded-lg transition-colors border border-slate-500/30"
              >
                {renderTokenIcon(stablecoins.find(token => token.baseToken === selectedPayToken) || stablecoins[0], "w-3.5 h-3.5")}
                <span className="text-white text-xs font-medium">{selectedPayToken}</span>
                <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400" />
              </button>

              {showPayTokenDropdown && (
                <div className="absolute top-full right-0 mt-2 bg-slate-800 rounded-lg border border-slate-600 shadow-xl z-50 max-h-48 overflow-y-auto min-w-[120px]">
                  {stablecoins.map((token, index) => (
                    <button
                      key={`${token.baseToken}-${token.chainId}-${index}`}
                      onClick={async () => {
                        setSelectedPayToken(token.baseToken);
                        setSelectedToken(token); // Update main selected token for theme
                        setShowPayTokenDropdown(false);

                        // Switch chain immediately when token is selected using hook
                        if (isConnected && switchChain) {
                          try {
                            const isCeloToken = (token.baseToken === 'USDT' || token.baseToken === 'cUSD');
                            const targetChainId = isCeloToken ? 42220 : 8453; // Celo : Base
                            const networkName = isCeloToken ? 'Celo' : 'Base';

                            console.log(`🔄 Pre-switching to ${networkName} (${targetChainId}) for ${token.baseToken}`);
                            await switchChain({ chainId: targetChainId });
                            console.log(`✅ Pre-switched to ${networkName} for ${token.baseToken}`);

                            // Fetch balance for the newly selected token
                            setTimeout(() => {
                              fetchWalletBalance(token.baseToken);
                            }, 1000); // Wait for chain switch to complete
                          } catch (error) {
                            console.error('❌ Pre-chain switch failed:', error);
                            // Show user-friendly error for Celo tokens
                            const isCeloToken = (token.baseToken === 'USDT' || token.baseToken === 'cUSD');
                            if (isCeloToken) {
                              console.warn(`Failed to switch to Celo for ${token.baseToken}. Transaction may fail if not on correct network.`);
                            }
                          }
                        }
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-700 flex items-center gap-2 text-xs transition-colors"
                    >
                      {renderTokenIcon(token, "w-3 h-3")}
                      <span className="text-white">{token.baseToken}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* You'll pay section */}
        <div className="mt-4">
          <div className="flex justify-between items-start">
            <span className="text-gray-400 text-sm">{t('pay.youllPay')}</span>
            <div className="text-right">
              {/* Network Label */}
              <div className="flex items-center justify-end gap-1 mb-1">
                {(() => {
                  const selectedTokenData = stablecoins.find(token =>
                    token.baseToken === (payCurrency === 'local' ? selectedPayToken : selectedPayToken)
                  );
                  const isCeloToken = selectedTokenData?.baseToken === 'USDT' || selectedTokenData?.baseToken === 'cUSD';
                  return (
                    <>
                      <img
                        src={isCeloToken ? "/celo.png" : "/assets/logos/base-logo.jpg"}
                        alt={isCeloToken ? "Celo" : "Base"}
                        className="w-3 h-3 rounded-full"
                      />
                      <span className="text-white text-xs">{isCeloToken ? "Celo" : "Base"}</span>
                    </>
                  );
                })()}
              </div>

              {/* Balance underneath Base */}
              <div className="text-xs text-gray-400 flex items-center justify-end gap-2">
                <span>{t('wallet.balance')}:</span>
                <button
                  onClick={() => setAmount(walletBalance)}
                  className="text-blue-400 font-medium hover:text-blue-300 transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  {selectedPayToken === 'USDC' ? (
                    <img src="/assets/logos/usdc-logo.png" alt="USDC" className="w-3 h-3" />
                  ) : selectedPayToken === 'USDT' ? (
                    <img src="/usdt.png" alt="USDT" className="w-3 h-3" />
                  ) : selectedPayToken === 'cUSD' ? (
                    <img src="/cUSD.png" alt="cUSD" className="w-3 h-3" />
                  ) : (
                    <span className="text-sm">
                      {stablecoins.find(token => token.baseToken === selectedPayToken)?.flag || '🌍'}
                    </span>
                  )}
                  {selectedPayToken} {walletBalance}
                </button>
                <button
                  onClick={refreshBalance}
                  className="text-gray-400 hover:text-blue-400 transition-colors p-1 rounded hover:bg-slate-700/50"
                  title="Refresh balance"
                >
                  <ArrowPathIcon className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-gray-300 mb-4 font-semibold">
            1 {selectedPayToken} = {isLoadingRate ? '...' : currentRate} {selectedCountry.currency} • {t('pay.paymentCompletes')}
          </div>
        </div>
      </div>

      {/* Payment Details */}
      <div className="space-y-3">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">{t('pay.totalTzs').replace('TZS', selectedCountry.currency)}</span>
            <span className="text-white">{paymentDetails.totalLocal} {selectedCountry.currency}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">{t('pay.fees')}</span>
            <span className="text-white">{paymentDetails.fee} {selectedCountry.currency}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">{t('pay.amountInUsdc').replace('USDC', selectedPayToken)}</span>
            <span className="text-white">{paymentDetails.usdcAmount} {selectedPayToken}</span>
          </div>
        </div>
      </div>

      {/* Swipe to Pay */}
      <div className="mt-6">
        <div className="relative bg-[#1C1917] rounded-2xl p-1.5 overflow-hidden shadow-2xl shadow-black/20 border border-black/10">
          {/* Progress Background */}
          <div
            className="absolute left-0 top-0 h-full bg-white/20 rounded-full transition-all duration-150 ease-in-out"
            style={{ width: `${swipeProgress}%` }}
          />

          <div className="relative flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                <CurrencyDollarIcon className="w-4 h-4 text-[#1C1917]" />
              </div>
              <span className="text-white font-bold text-sm flex items-center gap-2">
                {isConfirming ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {t('pay.confirming')}
                  </>
                ) : isSwipeComplete ? (
                  t('pay.processing')
                ) : t('pay.swipeToPay')}
              </span>
            </div>

            <div className="text-white text-sm font-bold flex items-center gap-2">
              {payCurrency === 'local' ? (
                <>
                  <span className="text-lg">{selectedCountry.flag}</span>
                  <span>{amount || '0'} {selectedCountry.currency}</span>
                </>
              ) : (
                <>
                  {selectedPayToken === 'USDC' ? (
                    <img src="/assets/logos/usdc-logo.png" alt="USDC" className="w-5 h-5" />
                  ) : selectedPayToken === 'USDT' ? (
                    <img src="/usdt.png" alt="USDT" className="w-5 h-5" />
                  ) : selectedPayToken === 'cUSD' ? (
                    <img src="/cUSD.png" alt="cUSD" className="w-5 h-5" />
                  ) : (
                    (() => {
                      const tokenData = stablecoins.find(s => s.baseToken === selectedPayToken);
                      if (tokenData && tokenData.flag && !tokenData.flag.includes('_LOGO')) {
                        return <span className="text-lg">{tokenData.flag}</span>;
                      }
                      return <span className="w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center text-xs">?</span>;
                    })()
                  )}
                  <span>{amount || '0'} {selectedPayToken}</span>
                </>
              )}
            </div>
          </div>

          {/* Touch/Click Handler */}
          <div
            className="absolute inset-0 cursor-pointer"
            onMouseDown={(e) => {
              e.preventDefault();
              const rect = e.currentTarget.getBoundingClientRect();
              const startX = e.clientX - rect.left;

              const handleMouseMove = (moveEvent: MouseEvent) => {
                const currentX = moveEvent.clientX - rect.left;
                const progress = Math.min(Math.max(((currentX - startX) / rect.width) * 100, 0), 100);
                setSwipeProgress(progress);

                if (progress >= 80) {
                  setIsSwipeComplete(true);
                  setTimeout(() => {
                    handlePayTransaction();
                    setIsSwipeComplete(false);
                    setSwipeProgress(0);
                  }, 500);
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                }
              };

              const handleMouseUp = () => {
                if (swipeProgress < 80) {
                  setSwipeProgress(0);
                }
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              const rect = e.currentTarget.getBoundingClientRect();
              const startX = e.touches[0].clientX - rect.left;

              const handleTouchMove = (moveEvent: TouchEvent) => {
                moveEvent.preventDefault();
                const currentX = moveEvent.touches[0].clientX - rect.left;
                const progress = Math.min(Math.max(((currentX - startX) / rect.width) * 100, 0), 100);
                setSwipeProgress(progress);

                if (progress >= 80) {
                  setIsSwipeComplete(true);
                  setTimeout(() => {
                    handlePayTransaction();
                    setIsSwipeComplete(false);
                    setSwipeProgress(0);
                  }, 500);
                  document.removeEventListener('touchmove', handleTouchMove);
                  document.removeEventListener('touchend', handleTouchEnd);
                }
              };

              const handleTouchEnd = () => {
                if (swipeProgress < 80) {
                  setSwipeProgress(0);
                }
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleTouchEnd);
              };

              document.addEventListener('touchmove', handleTouchMove, { passive: false });
              document.addEventListener('touchend', handleTouchEnd);
            }}
          />
        </div>

        <div className="text-center mt-2 text-sm text-gray-400 font-medium">
          {t('pay.dragToConfirm')}
        </div>
      </div>
    </div>
  );

  const renderDepositTab = () => {
    const depositCountries = [
      { code: 'GH', fiat: 'GHS' as const, name: 'Ghana', currency: 'GHS', flag: '🇬🇭' },
      { code: 'KE', fiat: 'KES' as const, name: 'Kenya', currency: 'KES', flag: '🇰🇪' },
      { code: 'TZ', fiat: 'TZS' as const, name: 'Tanzania', currency: 'TZS', flag: '🇹🇿' },
      { code: 'MW', fiat: 'MWK' as const, name: 'Malawi', currency: 'MWK', flag: '🇲🇼' },
      { code: 'CD', fiat: 'CDF' as const, name: 'DR Congo', currency: 'CDF', flag: '🇨🇩' },
      { code: 'UG', fiat: 'UGX' as const, name: 'Uganda', currency: 'UGX', flag: '🇺🇬' },
    ];

    const selectedDepositCountry = depositCountries.find(c => c.code === depositCountry) || depositCountries[1];

    // ── Step 1: Amount + Destination ─────────────────────────────────────
    if (depositStep === 1) {
      return (
        <div className="flex flex-col space-y-3">
          <h2 className="text-[#1C1917] text-base font-semibold">Add Money</h2>

          {/* Amount card */}
          <div className="bg-[#F4EFE6] border border-[#D4CEBE] rounded-2xl p-4">
            <div className="text-[11px] font-medium text-[#7C7468] mb-3">Amount to receive</div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={depositAmount === '100' ? '' : depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0"
                className="bg-transparent text-[#1C1917] text-3xl font-semibold tracking-tight flex-1 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-[#C8C1B4]"
              />
              <div className="relative">
                <button
                  onClick={() => {
                    const assets: Array<'USDC' | 'USDT' | 'NTZS'> = ['USDC', 'USDT'];
                    const idx = assets.indexOf(depositAsset as any);
                    setDepositAsset(assets[(idx + 1) % assets.length]);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#EDE8DF] hover:bg-[#E8E2D9] rounded-xl transition-colors border border-[#C8C1B4]/50"
                >
                  <span className="text-[#1C1917] text-sm font-semibold">{depositAsset}</span>
                  <ChevronDownIcon className="w-3.5 h-3.5 text-[#7C7468]" />
                </button>
              </div>
            </div>
          </div>

          {/* Source country */}
          <div className="bg-[#F4EFE6] border border-[#D4CEBE] rounded-2xl p-4">
            <div className="text-[11px] font-medium text-[#7C7468] mb-3">From</div>
            <div className="relative">
              <button
                onClick={() => setIsDepositCountryOpen(!isDepositCountryOpen)}
                className="w-full h-12 flex items-center gap-2.5 bg-[#EDE8DF] border border-[#C8C1B4]/70 rounded-xl px-3 hover:bg-[#E8E2D9] transition-colors"
              >
                <span className="text-xl">{selectedDepositCountry.flag}</span>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-[#1C1917] leading-none">{selectedDepositCountry.name}</div>
                  <div className="text-[10px] text-[#7C7468] mt-0.5">{selectedDepositCountry.currency}</div>
                </div>
                <ChevronDownIcon className={`w-4 h-4 text-[#7C7468] transition-transform ${isDepositCountryOpen ? 'rotate-180' : ''}`} />
              </button>
              {isDepositCountryOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#F4EFE6] border border-[#C8C1B4] rounded-xl shadow-xl z-50 overflow-hidden">
                  {depositCountries.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => { setDepositCountry(c.code); setIsDepositCountryOpen(false); }}
                      className={`w-full px-3 py-2.5 text-left flex items-center gap-2.5 transition-colors hover:bg-[#E4DDD3] ${selectedDepositCountry.code === c.code ? 'bg-blue-500/10' : ''}`}
                    >
                      <span className="text-lg">{c.flag}</span>
                      <div className="flex-1">
                        <span className="text-[#1C1917] text-sm font-medium block">{c.name}</span>
                        <span className="text-[#7C7468] text-[10px]">{c.currency}</span>
                      </div>
                      {selectedDepositCountry.code === c.code && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Continue */}
          <button
            onClick={() => {
              if (!depositCountry) setDepositCountry('KE');
              setDepositStep(2);
            }}
            disabled={!depositAmount || depositAmount === '0' || depositAmount === '100'}
            className={`w-full h-14 font-semibold text-base rounded-2xl transition-all ${
              depositAmount && depositAmount !== '0' && depositAmount !== '100'
                ? 'bg-[#1C1917] text-white active:scale-[0.98]'
                : 'bg-[#E8E2D9] text-[#9B9188] cursor-not-allowed'
            }`}
          >
            Continue
          </button>
        </div>
      );
    }

    // ── Step 2+: Provider flow ────────────────────────────────────────────
    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setDepositStep(1)}
            className="w-10 h-10 rounded-full border border-[#C8C1B4] flex items-center justify-center hover:bg-[#E8E2D9] transition-colors shrink-0"
          >
            <ArrowLeftIcon className="w-5 h-5 text-[#1C1917]" />
          </button>
          <div>
            <h2 className="text-[#1C1917] text-base font-medium">Add Money</h2>
            <p className="text-[#7C7468] text-xs">{selectedDepositCountry.flag} {selectedDepositCountry.name} · {depositAmount} {depositAsset}</p>
          </div>
        </div>
        <PretiumOnRampFlow
          asset={depositAsset}
          walletAddress={walletAddress}
          initialFiat={selectedDepositCountry.fiat}
          initialAmount={depositAmount}
          onBack={() => setDepositStep(1)}
        />
      </div>
    );
  };

  const renderLinkTab = () => (
    <div className="space-y-3">
      {/* Wallet Connection Status */}
      <div className={`border rounded-lg p-2 ${isConnected
        ? 'bg-green-600/20 border-green-600/30'
        : 'bg-yellow-600/20 border-yellow-600/30'
        }`}>
        <div className={`flex items-center gap-2 ${isConnected ? 'text-green-400' : 'text-yellow-400'
          }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400' : 'bg-yellow-400'
            }`}></span>
          <span className="text-xs font-medium flex items-center gap-1">
            {isWalletConnected ? (
              <>
                <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {t('link.connected')}
              </>
            ) : (
              <>
                <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {t('wallet.connect')} {t('navigation.link')}
              </>
            )}
          </span>
        </div>
        {isWalletConnected && walletAddress && (
          <div className="text-xs text-gray-400 mt-1 font-mono">
            {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
          </div>
        )}
      </div>

      {/* Payment Amount */}
      <div>
        <label className="block text-gray-400 text-xs mb-1">{t('link.paymentAmount')}</label>
        <div className="text-center py-4 bg-slate-800/30 rounded-lg">
          <div className="text-4xl text-white font-light">
            <span className="text-gray-400">$</span>
            <input
              type="number"
              value={linkAmount}
              onChange={(e) => setLinkAmount(e.target.value)}
              className="bg-transparent text-white text-4xl font-light w-20 text-center focus:outline-none"
              placeholder="6"
            />
          </div>
        </div>
      </div>

      {/* Protocol Fee Display for Link */}
      {isProtocolEnabled() && linkAmount && Number(linkAmount) > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-blue-400 font-medium">{t('link.protocolFee')}</span>
            <div className="text-right">
              {(() => {
                const feeInfo = calculateDynamicFee(Number(linkAmount));
                return (
                  <>
                    <div className="text-blue-400 font-mono">
                      {feeInfo.feeRate}%
                    </div>
                    <div className="text-gray-400 text-xs">
                      {feeInfo.tier}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Currency Selector */}
      <div>
        <label className="block text-gray-400 text-xs mb-1">{t('link.currency')}</label>
        <div className="relative">
          <button
            onClick={() => setShowLinkCurrencyDropdown(!showLinkCurrencyDropdown)}
            className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between border border-slate-600/50 hover:border-slate-500 transition-colors"
          >
            <div className="flex items-center gap-2">
              {renderTokenIcon(selectedStablecoin, "w-4 h-4")}
              <span>{selectedStablecoin.baseToken} - {selectedStablecoin.name}</span>
            </div>
            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
          </button>

          {showLinkCurrencyDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-y-auto max-h-80">
              {stablecoins.map((token, index) => {
                console.log('🔍 Rendering link token:', token.baseToken, token.name);
                return (
                  <button
                    key={`${token.baseToken}-${token.chainId}-${index}`}
                    onClick={() => {
                      setSelectedStablecoin(token);
                      setShowLinkCurrencyDropdown(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center gap-2 transition-colors hover:bg-slate-700 ${selectedStablecoin.baseToken === token.baseToken ? 'bg-blue-600/20' : ''
                      }`}
                  >
                    {renderTokenIcon(token, "w-4 h-4")}
                    <div className="flex flex-col">
                      <span className="text-white font-medium text-sm">{token.baseToken} - {token.name}</span>
                    </div>
                    {selectedStablecoin.baseToken === token.baseToken && (
                      <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-gray-400 text-xs mb-1">{t('link.description')}</label>
        <textarea
          value={linkDescription}
          onChange={(e) => setLinkDescription(e.target.value)}
          placeholder={t('link.descriptionPlaceholder')}
          rows={3}
          className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Generate Link Button */}
      <button
        onClick={isWalletConnected ? handleGeneratePaymentLink : () => {
          if (isSmartWalletEnvironment) {
            console.log('⚠️ Smart wallet environment - connection should happen automatically');
            // In Farcaster, try to connect to available connectors
            if (connectors.length > 0) {
              connect({ connector: connectors[0] });
            }
          } else {
            // Use wagmi connect for all environments
            if (connectors && connectors.length > 0) {
              connect({ connector: connectors[0] });
            }
          }
        }}
        disabled={!isWalletConnected || !linkAmount}
        className={`w-full font-medium py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm border-2 ${isWalletConnected && linkAmount
          ? 'bg-[#1C1917] hover:bg-[#2C2927] text-white shadow-lg border-black/10'
          : 'bg-[#E8E2D9] text-[#9B9188] cursor-not-allowed border-[#C8C1B4]/40'
          }`}
      >
        {isWalletConnected ? (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            {t('link.generateLink')}
          </>
        ) : (
          <>
            <WalletIcon className="w-4 h-4" />
            {t('wallet.connect')}
          </>
        )}
      </button>

      {/* Generated Link Display */}
      {generatedLink && (
        <div className="mt-3 p-3 bg-green-600/20 border border-green-600/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
            <span className="text-green-400 text-xs font-medium flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {t('link.linkGenerated')}
            </span>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2 font-mono text-xs text-gray-300 break-all">
            {generatedLink}
          </div>
          <div className="mt-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(generatedLink);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              }}
              className="w-full bg-[#1C1917] hover:bg-[#2C2927] text-white font-medium py-2 rounded-lg transition-colors text-xs flex items-center justify-center gap-1"
            >
              {linkCopied ? (
                <>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {t('link.copied')}
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {t('link.copyLink')}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );


  const renderHomeTab = () => {
    return (
      <>
        {/* Balance Card - WalletHome Style */}
        <div className="px-1 pb-6 -mx-1 -mt-1">
          <div
            className={cn(
              "relative overflow-hidden rounded-3xl",
              isLight
                ? "bg-[#DCD5C6] ring-1 ring-inset ring-black/[0.05] [box-shadow:0_3px_18px_rgba(0,0,0,0.08),0_1px_0_rgba(255,255,255,0.35)_inset]"
                : "bg-slate-950 ring-1 ring-inset ring-white/[0.08] [box-shadow:0_10px_40px_rgba(0,0,0,0.55),0_1px_0_rgba(255,255,255,0.08)_inset]"
            )}
          >
            <div className="relative w-full min-h-0 aspect-[16/10]">
              <Image
                src={isLight ? "/balance_card_lightmode.png" : "/Balance Card.png"}
                alt=""
                fill
                priority
                className={cn(
                  "object-cover object-left-top transform-gpu",
                  isLight
                    ? "scale-[1.18] sm:scale-[1.12] -translate-y-3 sm:-translate-y-2"
                    : "scale-[1.18] sm:scale-[1.12] -translate-y-3 sm:-translate-y-2"
                )}
                sizes="(max-width: 768px) 100vw, 420px"
              />

              <div className="absolute inset-0 z-10">
                <div className="relative h-full w-full px-5 pt-7 pb-8 sm:px-7 sm:pt-8 sm:pb-10 md:px-10 md:pt-10 md:pb-10">
                  <div className="absolute left-5 right-5 top-[34%] sm:left-7 sm:right-7 sm:top-[32%] md:left-10 md:right-10 md:top-[34%] max-w-[min(100%,22rem)]">
                    <div className="flex w-full touch-pan-x scroll-smooth snap-x snap-mandatory overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {/* Overview - Total Balance */}
                      <div className="w-full min-w-full shrink-0 snap-start pr-1">
                        <div
                          className={`text-xs font-mono font-medium tracking-wide drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)] ${isLight ? "text-slate-600" : "text-white/70 drop-shadow-[0_1px_1px_rgba(0,0,0,0.65)]"}`}
                        >
                          Total balance
                        </div>
                        <div className="mt-2 flex items-end justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div
                              className={`text-[clamp(1.75rem,6.8vw,2.5rem)] font-mono font-bold tabular-nums tracking-tight leading-[1.05] ${isLight ? "text-slate-800" : "text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]"}`}
                            >
                              {formatNumber(walletBalance)} <span className={isLight ? "text-slate-600" : "text-white/60"}>{selectedToken.baseToken}</span>
                            </div>
                          </div>
                          <div
                            className={`flex shrink-0 flex-col items-end gap-0.5 text-right ${isLight ? "text-slate-600" : "text-white/70"}`}
                            aria-live="polite"
                          >
                            <div className="flex items-center justify-end animate-[swipe-right_1.25s_ease-in-out_infinite]">
                              <ChevronRight className="h-3.5 w-3.5 -mr-1.5 opacity-90" aria-hidden />
                              <ChevronRight className="h-3.5 w-3.5 opacity-90" aria-hidden />
                            </div>
                            <span className="max-w-[5.75rem] text-[10px] font-mono font-medium leading-tight">Swipe to view details</span>
                          </div>
                        </div>
                        <p className={`mt-1 text-[10px] font-medium ${isLight ? "text-slate-500" : "text-white/50"}`}>Across stablecoins</p>
                      </div>
                      {/* Details - Token Breakdown */}
                      <div className="w-full min-w-full shrink-0 snap-start pl-1">
                        <div
                          className={`invisible text-xs font-mono font-medium tracking-wide ${isLight ? "text-slate-600" : "text-white/70"}`}
                          aria-hidden
                        >
                          Total balance
                        </div>
                        <div className="flex items-stretch justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col">
                              <div className="flex min-w-0 items-baseline justify-between gap-4 border-b border-black/5 dark:border-white/10">
                                <span className={`shrink-0 text-[11px] font-mono font-semibold uppercase tracking-wider ${isLight ? "text-slate-500" : "text-white/60"}`}>{selectedToken.baseToken}</span>
                                <span
                                  className={`min-w-0 truncate text-right text-[clamp(1.35rem,4.2vw,2rem)] font-mono font-semibold tabular-nums tracking-tight ${isLight ? "text-slate-800" : "text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]"}`}
                                >
                                  {formatNumber(walletBalance)}
                                </span>
                              </div>
                              <div className="flex min-w-0 items-baseline justify-between gap-4">
                                <span className={`shrink-0 text-[11px] font-mono font-semibold uppercase tracking-wider ${isLight ? "text-slate-500" : "text-white/60"}`}>USDC</span>
                                <span
                                  className={`min-w-0 truncate text-right text-[clamp(1.125rem,3.5vw,1.5rem)] font-mono font-semibold tabular-nums tracking-tight ${isLight ? "text-slate-800" : "text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]"}`}
                                >
                                  {formatNumber(walletBalance)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div
                            className={`flex shrink-0 flex-col items-end justify-center gap-0.5 self-stretch text-right ${isLight ? "text-slate-600" : "text-white/70"}`}
                            aria-live="polite"
                          >
                            <div className="flex items-center justify-end animate-[swipe-left_1.25s_ease-in-out_infinite]">
                              <ChevronLeft className="h-3.5 w-3.5 -mr-1.5 opacity-90" aria-hidden />
                              <ChevronLeft className="h-3.5 w-3.5 opacity-90" aria-hidden />
                            </div>
                            <span className="max-w-[5.75rem] text-[10px] font-mono font-medium leading-tight">Swipe for overview</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="absolute left-5 right-5 bottom-8 sm:left-7 sm:right-7 sm:bottom-10 md:left-10 md:right-10 md:bottom-10">
                    <div className="grid w-full max-w-md grid-cols-3 gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveTab('deposit')}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-xs font-mono font-medium backdrop-blur-xl transition-all duration-200 border md:gap-2 md:px-4 md:py-3 md:text-sm ${isLight
                          ? "border-white/50 bg-white/40 text-slate-800 hover:bg-white/50 hover:border-white/60 shadow-[0_8px_16px_rgba(0,0,0,0.06)]"
                          : "border-gray-600/40 bg-white/5 text-white hover:bg-white/10 hover:border-gray-500/50 active:bg-[#2563EB] active:text-white active:border-transparent"
                          }`}
                      >
                        <BanknoteArrowDown className="h-4 w-4 md:h-[18px] md:w-[18px]" />
                        <span className="whitespace-nowrap">Deposit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setActiveTab('send'); setSendStep('country'); }}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-xs font-mono font-medium backdrop-blur-xl transition-all duration-200 border md:gap-2 md:px-4 md:py-3 md:text-sm ${isLight
                          ? "border-white/50 bg-white/40 text-slate-800 hover:bg-white/50 hover:border-white/60 shadow-[0_8px_16px_rgba(0,0,0,0.06)]"
                          : "border-gray-600/40 bg-white/5 text-white hover:bg-white/10 hover:border-gray-500/50 active:bg-[#2563EB] active:text-white active:border-transparent"
                          }`}
                      >
                        <BanknoteArrowUp className="h-4 w-4 md:h-[18px] md:w-[18px]" />
                        <span className="whitespace-nowrap">Send</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('withdraw')}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-xs font-mono font-medium backdrop-blur-xl transition-all duration-200 border md:gap-2 md:px-4 md:py-3 md:text-sm ${isLight
                          ? "border-white/50 bg-white/40 text-slate-800 hover:bg-white/50 hover:border-white/60 shadow-[0_8px_16px_rgba(0,0,0,0.06)]"
                          : "border-gray-600/40 bg-white/5 text-white hover:bg-white/10 hover:border-gray-500/50 active:bg-[#2563EB] active:text-white active:border-transparent"
                          }`}
                      >
                        <Landmark className="h-4 w-4 md:h-[18px] md:w-[18px]" />
                        <span className="whitespace-nowrap">Withdraw</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Send Money Globally Banner - WalletHome Style */}
          <div className="mt-2">
            <div className={cn(
              "relative overflow-hidden rounded-3xl backdrop-blur-xl",
              isLight
                ? "bg-gradient-to-br from-[#F4EFE6] to-[#E2D9C8] ring-1 ring-inset ring-black/[0.03] [box-shadow:0_4px_20px_rgba(0,0,0,0.06),0_1px_0_rgba(255,255,255,0.6)_inset]"
                : "bg-background/30 border border-gray-600/30 shadow-[0_14px_34px_rgba(0,0,0,0.40)]"
            )}>
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.55),transparent_60%)] opacity-[0.10] dark:bg-[radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.18),transparent_60%)]" />

              <div className="relative px-5 py-6">
                <div className="absolute right-5 top-5 flex items-center -space-x-2">
                  <div className={cn(
                    "relative h-8 w-8 overflow-hidden rounded-full shadow-sm ring-2 z-20",
                    isLight ? "bg-[#E6DECD] ring-[#F4EFE6]" : "bg-background/70 ring-white dark:bg-background/30 dark:ring-white/10"
                  )}>
                    <Image src="/usdt.png" alt="" width={20} height={20} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className={cn(
                    "relative h-8 w-8 overflow-hidden rounded-full shadow-sm ring-2 z-10",
                    isLight ? "bg-[#E6DECD] ring-[#F4EFE6]" : "bg-background/70 ring-white dark:bg-background/30 dark:ring-white/10"
                  )}>
                    <Image src="/celo.png" alt="" fill sizes="32px" className="rounded-full object-cover" />
                  </div>
                  <div className={cn(
                    "relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-[10px] font-mono font-semibold shadow-sm ring-2 z-0",
                    isLight ? "bg-[#E6DECD] ring-[#F4EFE6] text-slate-500" : "bg-background/70 text-muted-foreground ring-white dark:bg-background/30 dark:text-white/70 dark:ring-white/10"
                  )}>
                    +
                  </div>
                </div>

                <div className="pr-24">
                  <div className="text-base font-mono font-semibold text-[#1C1917]">Send Money Globally</div>
                  <div className="mt-2 text-xs font-mono text-[#7C7468] leading-relaxed">
                    Use NEDApay to pay anywhere and settle everywhere, powered by stablecoins.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity - WalletHome Style */}
        <div className="mt-6 min-w-0 max-w-full overflow-x-hidden">
          <div className="mb-4 flex items-center justify-between pl-5">
            <div className="text-sm font-mono font-semibold text-[#1C1917]">Recent activity</div>
          </div>

          <div
            className={cn(
              "relative overflow-hidden rounded-3xl border backdrop-blur-xl min-w-0 max-w-full",
              isLight
                ? "bg-gradient-to-br from-[#F4EFE6] to-[#E2D9C8] ring-1 ring-inset ring-black/[0.03] border-transparent [box-shadow:0_4px_20px_rgba(0,0,0,0.06),0_1px_0_rgba(255,255,255,0.6)_inset]"
                : "bg-background/30 border-gray-600/30 shadow-[0_14px_34px_rgba(0,0,0,0.40)]"
            )}
          >
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.55),transparent_60%)] opacity-[0.08] dark:bg-[radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.18),transparent_60%)]" />
            {!isWalletConnected ? (
              <div className="px-6 py-10 text-sm font-mono text-[#7C7468] text-center">
                Sign in to view your recent activity.
              </div>
            ) : userTransactions.length === 0 ? (
              <div className="px-6 py-10 text-sm font-mono text-[#7C7468] text-center flex flex-col items-center">
                <Clock className="w-8 h-8 mb-2 text-[#7C7468]/50" />
                No recent activities
              </div>
            ) : (
              <div className="p-3 space-y-2 overflow-hidden min-w-0 w-full max-w-full">
                {userTransactions.slice(0, 4).map((tx) => (
                  <div
                    key={tx.id}
                    onClick={() => setActiveTab('activity')}
                    className={cn(
                      "block rounded-xl px-4 py-3 backdrop-blur-xl cursor-pointer transition-colors w-full max-w-full min-w-0 overflow-hidden",
                      "bg-foreground/[0.02] hover:bg-foreground/[0.04] active:bg-foreground/10",
                      "border border-gray-400/20",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 sm:gap-3 min-w-0 max-w-full">
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="flex items-center gap-2 min-w-0 w-full">
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0",
                            isLight ? "bg-[#D8D1C6] text-[#1C1917]" : "bg-slate-700/50 text-slate-300"
                          )}>
                            {tx.type === 'send' ? 'Sent' : tx.type === 'pay' ? 'Payment' : tx.type === 'deposit' ? 'Deposit' : 'Tx'}
                          </span>
                        </div>
                        <p className="text-sm font-mono font-medium text-[#1C1917] mt-1 min-w-0 break-words [overflow-wrap:anywhere] line-clamp-2 leading-snug">
                          {tx.type === 'send' ? `Sent to ${tx.recipient || 'recipient'}` : 
                           tx.type === 'pay' ? 'Payment processed' : 
                           tx.type === 'deposit' ? 'Deposit received' : 'Transaction'}
                        </p>
                      </div>
                      <div className="shrink-0 pt-0.5 text-right">
                        <div className={`text-sm font-mono font-semibold ${tx.type === 'send' || tx.type === 'pay' ? 'text-red-500' : 'text-green-500'}`}>
                          {tx.type === 'send' || tx.type === 'pay' ? '-' : '+'}{tx.amount} USD
                        </div>
                        <div className="text-[11px] font-mono text-[#7C7468] whitespace-nowrap tabular-nums">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {userTransactions.length >= 4 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('activity')}
                    className="w-full rounded-xl bg-foreground/5 border border-gray-400/20 hover:bg-foreground/10 transition-colors px-4 py-3 text-sm font-mono font-medium text-foreground"
                  >
                    More
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return renderHomeTab();
      case 'activity':
        return (
          <div className="space-y-4">
            <div className="mb-3 font-mono text-sm font-semibold text-[#1C1917]">Activity</div>
            <div
              className={cn(
                "relative overflow-hidden rounded-3xl border backdrop-blur-xl min-w-0 max-w-full",
                isLight
                  ? "bg-gradient-to-br from-[#F4EFE6] to-[#E2D9C8] ring-1 ring-inset ring-black/[0.03] border-transparent [box-shadow:0_4px_20px_rgba(0,0,0,0.06),0_1px_0_rgba(255,255,255,0.6)_inset]"
                  : "bg-background/30 border-gray-600/30 shadow-[0_14px_34px_rgba(0,0,0,0.40)]"
              )}
            >
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.55),transparent_60%)] opacity-[0.08] dark:bg-[radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.18),transparent_60%)]" />
              {!isWalletConnected ? (
                <div className="px-6 py-10 text-sm font-mono text-[#7C7468] text-center">
                  Sign in to view your activity.
                </div>
              ) : userTransactions.length === 0 ? (
                <div className="px-6 py-10 text-sm font-mono text-[#7C7468] text-center flex flex-col items-center">
                  <Clock className="w-8 h-8 mb-2 text-[#7C7468]/50" />
                  No activities yet
                </div>
              ) : (
                <div className="p-3 space-y-2 overflow-hidden min-w-0 w-full max-w-full">
                  {userTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className={cn(
                        "block rounded-xl px-4 py-3 backdrop-blur-xl cursor-pointer transition-colors w-full max-w-full min-w-0 overflow-hidden",
                        "bg-foreground/[0.02] hover:bg-foreground/[0.04] active:bg-foreground/10",
                        "border border-gray-400/20",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 sm:gap-3 min-w-0 max-w-full">
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <div className="flex items-center gap-2 min-w-0 w-full">
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0",
                              isLight ? "bg-[#D8D1C6] text-[#1C1917]" : "bg-slate-700/50 text-slate-300"
                            )}>
                              {tx.type === 'send' ? 'Sent' : tx.type === 'pay' ? 'Payment' : tx.type === 'deposit' ? 'Deposit' : 'Tx'}
                            </span>
                          </div>
                          <p className="text-sm font-mono font-medium text-[#1C1917] mt-1 min-w-0 break-words [overflow-wrap:anywhere] line-clamp-2 leading-snug">
                            {tx.type === 'send' ? `Sent to ${tx.recipient || 'recipient'}` : 
                             tx.type === 'pay' ? 'Payment processed' : 
                             tx.type === 'deposit' ? 'Deposit received' : 'Transaction'}
                          </p>
                        </div>
                        <div className="shrink-0 pt-0.5 text-right">
                          <div className={`text-sm font-mono font-semibold ${tx.type === 'send' || tx.type === 'pay' ? 'text-red-500' : 'text-green-500'}`}>
                            {tx.type === 'send' || tx.type === 'pay' ? '-' : '+'}{tx.amount} USD
                          </div>
                          <div className="text-[11px] font-mono text-[#7C7468] whitespace-nowrap tabular-nums">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-4">
            <h2 className={cn("text-2xl font-bold px-2", isLight ? "text-[#1C1917]" : "text-white")}>Settings</h2>
            <div className={cn(
              "rounded-2xl p-4 border",
              isLight
                ? "bg-gradient-to-br from-[#F4EFE6] to-[#E2D9C8] ring-1 ring-inset ring-black/[0.03] border-transparent [box-shadow:0_4px_20px_rgba(0,0,0,0.06),0_1px_0_rgba(255,255,255,0.6)_inset]"
                : "bg-[#151925] border-slate-800/50"
            )}>
              <div className="flex items-center gap-4 mb-6">
                <div className={cn(
                  "w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold",
                )}>
                  {farcasterProfile?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className={cn("font-bold text-lg", isLight ? "text-[#1C1917]" : "text-white")}>@{farcasterProfile?.username || 'User'}</h3>
                  <p className={cn("text-sm font-mono", isLight ? "text-[#7C7468]" : "text-gray-400")}>{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</p>
                </div>
              </div>

              <div className="space-y-2">
                {['Account', 'Security', 'Notifications', 'Help & Support'].map((item) => (
                  <button 
                    key={item} 
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-xl transition-colors",
                      isLight 
                        ? "hover:bg-black/5 text-[#1C1917]" 
                        : "hover:bg-white/5 text-white"
                    )}
                  >
                    <span className="font-medium">{item}</span>
                    <ArrowRightIcon className={cn("w-4 h-4", isLight ? "text-[#7C7468]" : "text-gray-500")} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 'send':
        return renderSendTab();
      case 'pay':
        return renderPayTab();
      case 'deposit':
        return renderDepositTab();
      case 'link':
        return renderLinkTab();
      case 'withdraw':
        return (
          <WithdrawFlow
            walletAddress={walletAddress || ''}
            walletBalance={walletBalance}
            onRefreshBalance={() => fetchWalletBalance()}
            onBack={() => setActiveTab('home')}
            executePaycrestTransaction={executePaycrestTransaction}
            switchChain={switchChain as any}
            isConnected={isConnected}
            stablecoins={stablecoins as any}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-[100dvh] pb-24 overflow-hidden font-sans bg-[#EDE8DF]">
      {/* Background Effects - Light Mode Only */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 opacity-[0.15] [background-image:linear-gradient(to_right,rgba(0,0,0,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.1)_1px,transparent_1px)] [background-size:28px_28px]" />
      </div>

      <div className="w-full mx-auto relative z-10 px-4">
        {/* Clean Header - Compact */}
        <div className="flex items-center justify-between mb-6 w-full px-1 pt-2 !overflow-visible z-50">
          {/* Left - Logo */}
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8 rounded-xl overflow-hidden shadow-lg shadow-blue-500/10">
              <Image
                src="/NEDApayLogo.png"
                alt="NedaPay"
                fill
                sizes="32px"
                className="object-cover"
              />
            </div>
            <span className="font-bold text-lg tracking-tight text-[#1C1917]">NEDApay</span>
          </div>

          {/* Right Section - Profile + Menu */}
          <div className="flex items-center gap-3">

            {/* Wallet Connection */}
            {!isWalletConnected ? (
              <button
                onClick={async () => {
                  try {
                    console.log('🔗 Wallet button clicked!');
                    console.log('Environment:', isSmartWalletEnvironment ? 'Farcaster/MiniApp' : 'Website');
                    console.log('Available connectors:', connectors?.map(c => ({ name: c.name, id: c.id })));

                    if (connectors && connectors.length > 0) {
                      let preferredConnector;

                      if (isSmartWalletEnvironment) {
                        // For Farcaster MiniApp, prioritize farcaster connector
                        preferredConnector = connectors.find(c =>
                          c.name.toLowerCase().includes('farcaster') ||
                          c.id.toLowerCase().includes('farcaster') ||
                          c.name.toLowerCase().includes('miniapp')
                        );
                      } else {
                        // For normal web browser, prioritize web wallet connectors
                        preferredConnector = connectors.find(c =>
                          c.name.toLowerCase().includes('coinbase') ||
                          c.name.toLowerCase().includes('metamask') ||
                          c.name.toLowerCase().includes('walletconnect')
                        );
                      }

                      // Fallback to first available connector
                      preferredConnector = preferredConnector || connectors[0];

                      console.log('🔌 Connecting with:', {
                        name: preferredConnector.name,
                        id: preferredConnector.id,
                        environment: isSmartWalletEnvironment ? 'Farcaster' : 'Web',
                        totalConnectors: connectors.length
                      });

                      await connect({ connector: preferredConnector });
                    } else {
                      console.error('❌ No connectors available');
                      alert('No wallet connectors available in this environment');
                    }
                  } catch (error) {
                    console.error('❌ Failed to connect wallet:', error);
                    alert('Failed to connect wallet. Please try again.');
                  }
                }}
                className="relative px-4 py-2 rounded-xl font-semibold text-xs transition-all duration-200 flex items-center gap-2 bg-[#EDE8DF] border border-[#C8C1B4] text-[#1C1917] hover:bg-[#E4DDD3] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
              >
                <WalletIcon className="w-4 h-4" />
                <span>Connect</span>
              </button>
            ) : (
              <>
                {/* Profile Display - Expanded */}
                <div className="flex items-center gap-2 bg-[#E4DDD3] rounded-xl px-3 py-1.5 border border-[#C8C1B4] shadow-sm">
                  {/* Green dot */}
                  <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0 animate-pulse" />

                  {/* Profile Image & Username */}
                  {(farcasterProfile || farcasterUser) ? (
                    <div className="flex items-center gap-2">
                      <img
                        src={(farcasterProfile?.pfpUrl || farcasterUser?.pfpUrl) || '/default-avatar.svg'}
                        alt="avatar"
                        className="w-5 h-5 rounded-full object-cover border border-white/10 flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.svg'; }}
                      />
                      <span className="text-[#1C1917] text-xs font-semibold">@{farcasterProfile?.username || farcasterUser?.username}</span>
                    </div>
                  ) : (
                    <span className="text-[#1C1917] text-xs font-mono font-medium">
                      {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                    </span>
                  )}
                </div>
              </>
            )}

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-xl transition-colors group hover:bg-black/5 text-[#7C7468] hover:text-[#1C1917]"
              >
                <BellIcon className="w-5 h-5 transition-colors" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#EDE8DF]"></span>
                )}
              </button>
            </div>

            {/* Menu Button */}
            <button
              onClick={() => setIsSideMenuOpen(true)}
              className="p-2 rounded-xl transition-colors group bg-[#E4DDD3] border border-[#C8C1B4] hover:bg-[#DDD7CD] text-[#7C7468] hover:text-[#1C1917]"
            >
              <svg className="w-5 h-5 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Notification Panel - Floating Independent */}
        {showNotifications && (
          <div className="absolute top-14 right-2 z-50 w-80 max-w-[calc(100vw-32px)]">
            {/* Backdrop for mobile closes */}
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => setShowNotifications(false)}
            />

            {/* Panel */}
            <div className="relative glass-card shadow-2xl z-50 max-h-[60vh] flex flex-col overflow-hidden animate-slide-in origin-top-right">
              {/* Header */}
              <div className={`p-3 border-b border-slate-600/20 flex justify-between items-center bg-gradient-to-r ${isCeloToken ? 'from-[#FCFF52]/10 to-[#FDFF8B]/10' : 'from-blue-500/10 to-purple-500/10'}`}>
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 ${isCeloToken ? 'bg-[#FCFF52]/20 border-[#FCFF52]/30' : 'bg-blue-500/20 border-blue-500/30'} rounded-lg border`}>
                    <BellIcon className={`w-3.5 h-3.5 ${isCeloToken ? 'text-[#FCFF52]' : 'text-blue-400'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-xs">{t('notifications.title')}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {notifications.length > 0 && (
                    <button
                      className="text-[10px] text-blue-400 hover:text-blue-300 bg-blue-500/20 hover:bg-blue-500/30 px-2 py-0.5 rounded-lg transition-all font-medium"
                      onClick={clearAllNotifications}
                    >
                      {t('notifications.clearAll')}
                    </button>
                  )}
                  <button
                    className="p-1 hover:bg-slate-700/50 rounded-lg transition-colors"
                    onClick={() => setShowNotifications(false)}
                  >
                    <svg className="w-3 h-3 text-gray-400 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[300px]">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center">
                    <div className="bg-gradient-to-br from-slate-700/30 to-slate-800/30 rounded-xl p-4 border border-slate-600/20">
                      <div className="bg-blue-500/20 rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-2 border border-blue-500/30">
                        <BellIcon className="w-5 h-5 text-blue-400" />
                      </div>
                      <h4 className="text-white font-semibold mb-1 text-xs">{t('notifications.noNotifications')}</h4>
                      <p className="text-gray-400 text-[10px] leading-relaxed">
                        {t('send.subtitle')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-2">
                    {notifications.map((notification, index) => (
                      <div
                        key={notification.id}
                        className={`mb-2 rounded-xl border transition-all duration-300 cursor-pointer group ${!notification.read
                          ? (isCeloToken ? 'bg-gradient-to-r from-[#FCFF52]/10 to-[#FDFF8B]/10 border-[#FCFF52]/30 hover:from-[#FCFF52]/15 hover:to-[#FDFF8B]/15' : 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30 hover:from-blue-500/15 hover:to-purple-500/15')
                          : 'bg-gradient-to-r from-slate-800/50 to-slate-700/50 border-slate-600/20 hover:from-slate-700/60 hover:to-slate-600/60'
                          }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="p-2.5">
                          <div className="flex items-start gap-2">
                            {/* Status Indicator & Icon */}
                            <div className="mt-0.5">
                              {!notification.read ? (
                                <div className={`w-2 h-2 rounded-full ${isCeloToken ? 'bg-[#FCFF52] animate-pulse shadow-[0_0_8px_rgba(252,255,82,0.5)]' : 'bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]'}`} />
                              ) : (
                                <div className="w-2 h-2 rounded-full bg-slate-600" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-medium mb-0.5 break-words ${!notification.read ? 'text-white' : 'text-gray-400'}`}>
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-500">
                                  {notification.timestamp}
                                </span>
                                {notification.type && (
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${notification.type === 'send' || notification.type === 'pay'
                                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                    : notification.type === 'deposit'
                                      ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                      : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                                    }`}>
                                    {notification.type.toUpperCase()}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button> */}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content - with bottom padding for fixed nav */}
        <div className="px-2 py-4 pb-32">
          {renderTabContent()}
        </div>
      </div>

      {/* Bottom Navigation - WalletHome Style */}
      <div className="fixed left-0 right-0 bottom-0 z-40">
        <div className="mx-auto max-w-md px-4 pb-6">
          <div className={cn(
            "relative overflow-hidden rounded-[2rem] border backdrop-blur-xl",
            isLight
              ? 'bg-[#EDE8DF]/95 border-[#C8C1B4] shadow-[0_20px_48px_rgba(0,0,0,0.10)]'
              : 'bg-background/40 border-gray-600/30 shadow-[0_18px_48px_rgba(0,0,0,0.55)]'
          )}>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.55),transparent_60%)] opacity-[0.10] dark:bg-[radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.18),transparent_60%)]"
            />
            <div className="px-3 py-2">
              <div className="grid grid-cols-3 gap-1">
                {[
                  { key: 'home' as Tab, label: 'Home', icon: Home },
                  { key: 'activity' as Tab, label: 'Activity', icon: List },
                  { key: 'settings' as Tab, label: 'Settings', icon: Settings },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] sm:text-xs font-mono font-medium transition-colors",
                      activeTab === key
                        ? "text-[#1C1917] bg-[#1C1917]/[0.06]"
                        : "text-[#7C7468] hover:text-[#1C1917] hover:bg-[#1C1917]/[0.03]"
                    )}
                    aria-label={label}
                  >
                    <Icon className={cn(
                      "h-5 w-5",
                      activeTab === key ? "text-[#1C1917]" : "text-[#7C7468]"
                    )} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal />

      {/* Error Modal */}
      <ErrorModal />



      {/* Sidebar Menu */}
      <Sidebar
        isOpen={isSideMenuOpen}
        onClose={() => setIsSideMenuOpen(false)}
        authenticated={isWalletConnected}
        onOpenFAQ={() => setShowFAQModal(true)}
      />

      {/* FAQ Modal */}
      {showFAQModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFAQModal(false)} />
          <div className="relative w-full max-w-lg bg-slate-900 rounded-t-3xl max-h-[85vh] overflow-hidden animate-slide-up">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-700/50 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">FAQ</h2>
              <button onClick={() => setShowFAQModal(false)} className="p-2 hover:bg-slate-800 rounded-full">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(85vh-60px)] space-y-3">
              {[
                { q: "What is NEDA Pay?", a: "NEDA Pay is a seamless platform for merchants and creators to get paid in local stablecoins." },
                { q: "How do I receive payments?", a: "Create a payment link or QR code and share it with your customers. Payments arrive instantly." },
                { q: "Is NEDA Pay secure?", a: "Yes! Your private keys stay with you. All transactions are processed transparently on-chain." },
                { q: "Can I use it internationally?", a: "Yes, you can accept payments from anyone, anywhere instantly." },
                { q: "What fees does NEDA Pay charge?", a: "We keep it simple with low transaction fees. Details are in your dashboard." },
              ].map((faq, i) => (
                <details key={i} className="bg-slate-800/60 rounded-xl border border-slate-700/50 group">
                  <summary className="p-3 cursor-pointer text-white font-medium text-sm flex justify-between items-center">
                    {faq.q}
                    <svg className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <p className="px-3 pb-3 text-gray-400 text-sm">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
