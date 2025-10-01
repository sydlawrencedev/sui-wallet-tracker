import fs from 'fs';
import path from 'path';

const latestPricesCsv = path.join(process.cwd(), '../sui-data/live-data-latest.csv');

let mostRecentPrices = {
    USDC: 1,
    SUI: 123,
    DEEP: 12
};

export { mostRecentPrices };

export async function getLatestPrice(token: string): Promise<Number> {
    const fileContent = await fs.readFileSync(latestPricesCsv, 'utf8');
    const lines = fileContent.trim().split('\n');

    if (token === "USDC") {
        return 1;
    }

    if (lines.length === 0) {
        throw new Error('Empty file');
    }

    const candles: any[] = [];
    let lineCount = 0;
    let errorCount = 0;
    const maxErrors = 10;

    for (const line of lines) {
        lineCount++;
        if (!line.trim()) continue; // Skip empty lines
        if (lineCount === 1) {
            continue; // Skip header line
        }
        try {
            // Split the line into timestamp and JSON data
            const firstComma = line.indexOf(',');
            if (firstComma === -1) {
                console.error(`No comma found in line ${lineCount}`);
                continue;
            }

            const timestamp = line.substring(0, firstComma).trim();
            let jsonStr = line.substring(firstComma + 1).trim();

            // Remove surrounding quotes if they exist
            if (jsonStr.startsWith('"') && jsonStr.endsWith('"')) {
                jsonStr = jsonStr.slice(1, -1);
            }

            // Handle the quadruple quotes in the JSON
            let fixedJson = jsonStr.replace(/""""/g, '"'); // Replace """" with "
            fixedJson = fixedJson.replace(/""/g, '"');      // Replace "" with "

            // Parse the JSON data
            const data = JSON.parse(fixedJson);

            if (!Array.isArray(data)) {
                console.error(`Expected array in line ${lineCount}, got:`, typeof data);
                errorCount++;
                if (errorCount > maxErrors) {
                    console.error('Too many errors, stopping processing');
                    break;
                }
                continue;
            }

            let coinData = undefined;

            // Find the SUI data in the array
            if (token === "SUI") {
                coinData = data.find((item: any) => item?.coin === 'SUI');
                if (!coinData) {
                    console.log(`No SUI data found in array at line ${lineCount}`);
                    errorCount++;
                    if (errorCount > maxErrors) {
                        console.error('Too many errors, stopping processing');
                        break;
                    }
                    continue;
                }
            }

            // Find the SUI data in the array
            else if (token === "DEEP") {
                coinData = data.find((item: any) => item?.coin === 'DEEP');
                if (!coinData) {
                    console.log(`No DEEP data found in array at line ${lineCount}`);
                    errorCount++;
                    if (errorCount > maxErrors) {
                        console.error('Too many errors, stopping processing');
                        break;
                    }
                    continue;
                }
            }

            // Create candle from SUI data
            const candle: any = {
                timestamp: new Date(timestamp),
                close: parseFloat(coinData.close),
                isClosed: true
            };

            if (isNaN(candle.close)) {
                throw new Error(`Invalid number in data: ${JSON.stringify(coinData)}`);
            }

            candles.push(candle);
        } catch (e: unknown) {
            const error = e as Error;
            console.error(`Error processing line ${lineCount}:`, error.message);
            errorCount++;
            if (errorCount > maxErrors) {
                console.error('Too many errors, stopping processing');
                break;
            }
        }
    }

    let close = candles.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())[0].close;

    // Add type guard to ensure token is a valid key
    if (token === 'USDC' || token === 'SUI' || token === 'DEEP') {
        mostRecentPrices[token] = close;
    } else {
        console.warn(`Unknown token: ${token}`);
    }

    return close;
}
