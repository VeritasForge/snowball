import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import Home from '../../src/app/page';
import React from 'react';
import { useAuthStore } from '../../src/lib/auth';

describe('Home Page Integration', () => {
  beforeEach(() => {
     useAuthStore.setState({
         isAuthenticated: true,
         token: 'fake-token',
         user: { id: '1', email: 'test@test.com' }
     });
     localStorage.setItem('access_token', 'fake-token');
  });

  it('renders account list from MSW', async () => {
    render(<Home />);

    // MSW returns "Mock Account"
    // Wait for the text to appear (async fetch)
    await waitFor(() => {
        // We use regex or partial match if needed, or exact text
        // The mock data name is "Mock Account".
        // In the UI it might be in a button or header.
        expect(screen.getByText('Mock Account')).toBeInTheDocument();
    });

    // Check for dashboard elements
    expect(screen.getByText('Mock Account Overview')).toBeInTheDocument();
  });
});
