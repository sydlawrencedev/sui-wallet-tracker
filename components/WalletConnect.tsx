'use client';

import type { AppKitNetwork } from '@reown/appkit/networks'
import type { CustomCaipNetwork } from '@reown/appkit-common'
import { UniversalConnector } from '@reown/appkit-universal-connector'

// Get projectId from https://dashboard.reown.com
export const projectId = "06bcf408d1abb86f6c7b89649cf8ab74" // this is a public projectId only to use on localhost

if (!projectId) {
    throw new Error('Project ID is not defined')
}

// you can configure your own network
const suiMainnet: CustomCaipNetwork<'sui'> = {
    id: 784,
    chainNamespace: 'sui' as const,
    caipNetworkId: 'sui:mainnet',
    name: 'Sui',
    nativeCurrency: { name: 'SUI', symbol: 'SUI', decimals: 9 },
    rpcUrls: { default: { http: ['https://fullnode.mainnet.sui.io:443'] } }
}


export async function WalletConnect() {
    // const universalConnector = await UniversalConnector.init({
    //     projectId,
    //     metadata: {
    //         name: 'Universal Connector',
    //         description: 'Universal Connector',
    //         url: 'https://appkit.reown.com',
    //         icons: ['https://appkit.reown.com/icon.png']
    //     },
    //     networks: [
    //         {
    //             methods: ['sui_signPersonalMessage'],
    //             chains: [suiMainnet as CustomCaipNetwork],
    //             events: [],
    //             namespace: 'sui'
    //         }
    //     ]
    // })

    // return universalConnector
}