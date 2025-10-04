'use client';

import { useEffect, useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

interface PriceData {
    date: string;
    TOKENS_AVAILABLE: number;
    FUNDS: number;
    SUI?: number;
    GBP?: number;
    DEEP?: number;
    USDC?: number;
}

export interface FundsChartProps {
    latestTokenValue?: number;
}

export function FundsChart({ latestTokenValue }: FundsChartProps) {
    const [priceData, setPriceData] = useState<PriceData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);

                // Fetch price history
                const priceResponse = await fetch('/api/price-history');

                if (!priceResponse.ok) {
                    throw new Error(`Error fetching data: ${priceResponse.status}`);
                }

                const priceData = await priceResponse.json();
                setPriceData(priceData.data);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    // Process the data for the chart
    const chartData = useMemo(() => {
        if (!priceData.length) return null;

        // Sort data by date in ascending order and filter to only include data from Sep 13, 2025 onwards
        const minDate = new Date('2025-09-13T00:00:00').getTime();
        const sortedAndFilteredData = [...priceData]
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .filter(item => new Date(item.date).getTime() >= minDate);

        if (sortedAndFilteredData.length === 0) return null;

        // Make a copy of the data to avoid mutating the original
        const chartData = [...sortedAndFilteredData];

        // If we have a latest token value, update the most recent data point
        if (latestTokenValue !== undefined && chartData.length > 0) {
            const latestDataPoint = { ...chartData[chartData.length - 1] };
            if (latestDataPoint) {
                latestDataPoint.FUNDS = latestTokenValue * (1000000 - latestDataPoint.TOKENS_AVAILABLE);
                chartData[chartData.length - 1] = latestDataPoint;
            }
        }

        const labels = chartData.map(item => item.date);

        // Calculate the share price: FUNDS / (1000000 - TOKENS_AVAILABLE)
        const sharePrices = chartData.map(item => {
            const denominator = 1000000 - item.TOKENS_AVAILABLE;
            return denominator > 0 ? item.FUNDS / denominator : 0;
        });

        // const suiPrices = chartData.map(item => item.SUI || 0);

        return {
            labels,
            datasets: [
                {
                    label: 'Share Price',
                    data: sharePrices.map((price, index) => ({
                        x: labels[index],
                        y: price
                    })),
                    borderColor: 'rgba(96, 165, 250, 0.8)',
                    backgroundColor: 'rgba(96, 165, 250, 1)',
                    borderWidth: 2,
                    tension: 0.3,
                    yAxisID: 'y',
                },
                // {
                //     label: 'SUI Price',
                //     data: suiPrices.map((price, index) => ({
                //         x: labels[index],
                //         y: price
                //     })),
                //     borderColor: 'rgba(168, 85, 247, 0.8)',
                //     backgroundColor: 'rgba(168, 85, 247, 0.1)',
                //     borderWidth: 2,
                //     borderDash: [5, 5],
                //     tension: 0.3,
                //     yAxisID: 'y',
                // }
            ]
        };
    }, [priceData, latestTokenValue]);

    const options = {

        responsive: false,
        maintainAspectRatio: false,

        interaction: {
            mode: 'index' as const,
            intersect: false,
        },

        stacked: false,

        plugins: {


            legend: {
                display: false
            },
            title: {
                display: false,
                text: 'Performance Over Time',
            },
            tooltip: {
                callbacks: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label: function (context: any) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            }).format(context.parsed.y);
                        }
                        return label;
                    }
                }
            },
        },
        scales: {
            y: {
                type: 'linear' as const,
                display: (false) ? true : false,
                position: 'left' as const,
                title: {
                    display: false,
                    text: 'Price (USD)'
                },
                grid: {
                    drawOnChartArea: true,
                },
            },
            x: {
                display: false,
                grid: {
                    display: false
                },
                ticks: {
                    maxRotation: 45,
                    minRotation: 45
                }
            }
        },
    };

    if (isLoading) {
        return <div>Loading chart data...</div>;
    }

    if (!chartData) {
        return <div>No chart data available</div>;
    }

    return (
        <div className="w-full h-64">
            <Line options={options} data={chartData} />
        </div>
    );
}
