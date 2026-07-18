import { Link as RouterLink } from 'react-router-dom';
import { ReactComponent as Cp0xLogo } from '@/assets/images/cp0x-logo.svg';
import { ReactComponent as EulerWordmark } from '@/assets/images/euler-wordmark.svg';
import eulerLogo from '@/assets/images/euler-logo-dark-bg-32.png';
// material-ui
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';

// project imports
import { DASHBOARD_PATH } from 'config';

// ==============================|| MAIN LOGO ||============================== //

export default function LogoSection() {
  return (
    <Link
      component={RouterLink}
      to={DASHBOARD_PATH}
      aria-label="theme-logo"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        // gap: 1.5,
        textDecoration: 'none'
      }}
    >
      <Cp0xLogo style={{ width: 50, height: 30 }} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, marginTop: '2px' }}>
        <Box component="img" src={eulerLogo} alt="Euler" sx={{ width: 16, height: 16, borderRadius: '50%' }} />
        <EulerWordmark style={{ width: 42, height: 18 }} />
      </Box>
    </Link>
  );
}
