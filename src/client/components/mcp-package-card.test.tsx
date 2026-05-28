import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { McpPackageCard } from './mcp-package-card';

const sampleTools = [
  { id: 'tools.products.list', method: 'GET' as const },
  { id: 'tools.products.get', method: 'GET' as const },
  { id: 'tools.products.create', method: 'POST' as const },
];

describe('<McpPackageCard>', () => {
  it('renders the package name with the @ prefix and version chip', () => {
    render(
      <McpPackageCard
        name="shopify-mcp"
        endpointCount={20}
        savedPercent={55}
        transportLabel="stdio + http"
        authLabel="api key"
        sampleTools={sampleTools}
        extraToolsCount={5}
      />
    );
    expect(screen.getByText('shopify-mcp')).toBeInTheDocument();
    expect(screen.getByText('@')).toBeInTheDocument();
    expect(screen.getByText(/v0\.1\.0/)).toBeInTheDocument();
  });

  it('falls back to "untitled-mcp" when name is empty', () => {
    render(
      <McpPackageCard
        name=""
        endpointCount={0}
        savedPercent={0}
        transportLabel="stdio"
        authLabel="no auth"
        sampleTools={[]}
        extraToolsCount={0}
      />
    );
    expect(screen.getByText('untitled-mcp')).toBeInTheDocument();
  });

  it('renders the summary chips: endpoints, savings, transport, auth', () => {
    render(
      <McpPackageCard
        name="x"
        endpointCount={21}
        savedPercent={64}
        transportLabel="stdio + http"
        authLabel="bearer"
        sampleTools={sampleTools}
        extraToolsCount={0}
      />
    );
    expect(screen.getByText(/21 endpoints/i)).toBeInTheDocument();
    expect(screen.getByText(/−64%\s*context/i)).toBeInTheDocument();
    expect(screen.getByText('stdio + http')).toBeInTheDocument();
    expect(screen.getByText('bearer')).toBeInTheDocument();
  });

  it('lists the sample tools with their method badges', () => {
    render(
      <McpPackageCard
        name="x"
        endpointCount={3}
        savedPercent={0}
        transportLabel="stdio"
        authLabel="no auth"
        sampleTools={sampleTools}
        extraToolsCount={0}
      />
    );
    expect(screen.getByText('tools.products.list')).toBeInTheDocument();
    expect(screen.getByText('tools.products.create')).toBeInTheDocument();
  });

  it('shows "+ N more" when there are extra tools beyond the sample', () => {
    render(
      <McpPackageCard
        name="x"
        endpointCount={50}
        savedPercent={0}
        transportLabel="stdio"
        authLabel="no auth"
        sampleTools={sampleTools}
        extraToolsCount={47}
      />
    );
    expect(screen.getByText(/\+\s*47/)).toBeInTheDocument();
  });
});
