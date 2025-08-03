
import { db } from '../db';
import { journalLinesTable, journalEntriesTable, accountsTable } from '../db/schema';
import { type ReportPeriodInput, type CashFlowStatement } from '../schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export async function generateCashFlowStatement(input: ReportPeriodInput): Promise<CashFlowStatement> {
  try {
    // Get all cash account movements within the period
    // Cash accounts are typically assets with "cash" in the name or specific codes
    const cashFlowData = await db
      .select({
        transaction_type: journalEntriesTable.transaction_type,
        account_name: accountsTable.name,
        account_type: accountsTable.type,
        debit_amount: journalLinesTable.debit_amount,
        credit_amount: journalLinesTable.credit_amount,
        description: journalEntriesTable.description
      })
      .from(journalLinesTable)
      .innerJoin(journalEntriesTable, eq(journalLinesTable.journal_entry_id, journalEntriesTable.id))
      .innerJoin(accountsTable, eq(journalLinesTable.account_id, accountsTable.id))
      .where(
        and(
          gte(journalEntriesTable.date, input.start_date),
          lte(journalEntriesTable.date, input.end_date),
          eq(journalEntriesTable.status, 'posted'),
          // Focus on cash and cash equivalent accounts
          sql`(
            LOWER(${accountsTable.name}) LIKE '%cash%' OR 
            LOWER(${accountsTable.name}) LIKE '%bank%' OR
            ${accountsTable.code} LIKE '1-1%'
          )`
        )
      )
      .execute();

    // Initialize activity arrays
    const operatingActivities: Array<{ description: string; amount: number }> = [];
    const investingActivities: Array<{ description: string; amount: number }> = [];
    const financingActivities: Array<{ description: string; amount: number }> = [];

    // Group cash flows by transaction type and calculate net amounts
    const activityGroups = new Map<string, number>();

    cashFlowData.forEach(row => {
      // Calculate net cash effect (debit increases cash, credit decreases cash for asset accounts)
      const netAmount = parseFloat(row.debit_amount) - parseFloat(row.credit_amount);
      
      const key = `${row.transaction_type}_${row.description}`;
      activityGroups.set(key, (activityGroups.get(key) || 0) + netAmount);
    });

    // Categorize activities by transaction type
    let netOperatingCash = 0;
    let netInvestingCash = 0;
    let netFinancingCash = 0;

    activityGroups.forEach((amount, key) => {
      const [transactionType, description] = key.split('_', 2);
      
      if (Math.abs(amount) > 0.01) { // Only include significant amounts
        switch (transactionType) {
          case 'sale':
          case 'expense':
            operatingActivities.push({
              description: description || `${transactionType} transaction`,
              amount: amount
            });
            netOperatingCash += amount;
            break;
          
          case 'purchase':
            // Equipment/asset purchases are investing, inventory purchases are operating
            if (description.toLowerCase().includes('equipment') || 
                description.toLowerCase().includes('asset') ||
                description.toLowerCase().includes('investment')) {
              investingActivities.push({
                description: description || 'Asset purchase',
                amount: amount
              });
              netInvestingCash += amount;
            } else {
              operatingActivities.push({
                description: description || 'Inventory purchase',
                amount: amount
              });
              netOperatingCash += amount;
            }
            break;
          
          case 'manual':
            // Manual entries could be any category - categorize by description keywords
            const desc = description.toLowerCase();
            if (desc.includes('loan') || 
                desc.includes('equity') || 
                desc.includes('dividend') ||
                desc.includes('financing') ||
                desc.includes('capital')) {
              financingActivities.push({
                description: description || 'Financing activity',
                amount: amount
              });
              netFinancingCash += amount;
            } else if (desc.includes('equipment') || 
                       desc.includes('investment') ||
                       desc.includes('asset purchase')) {
              investingActivities.push({
                description: description || 'Investment activity',
                amount: amount
              });
              netInvestingCash += amount;
            } else {
              operatingActivities.push({
                description: description || 'Operating activity',
                amount: amount
              });
              netOperatingCash += amount;
            }
            break;
        }
      }
    });

    // Add summary entries if categories are empty
    if (operatingActivities.length === 0) {
      operatingActivities.push({
        description: 'No operating cash flows',
        amount: 0
      });
    }

    if (investingActivities.length === 0) {
      investingActivities.push({
        description: 'No investing cash flows',
        amount: 0
      });
    }

    if (financingActivities.length === 0) {
      financingActivities.push({
        description: 'No financing cash flows',
        amount: 0
      });
    }

    const netCashFlow = netOperatingCash + netInvestingCash + netFinancingCash;

    return {
      operating_activities: operatingActivities,
      investing_activities: investingActivities,
      financing_activities: financingActivities,
      net_operating_cash: Math.round(netOperatingCash * 100) / 100,
      net_investing_cash: Math.round(netInvestingCash * 100) / 100,
      net_financing_cash: Math.round(netFinancingCash * 100) / 100,
      net_cash_flow: Math.round(netCashFlow * 100) / 100,
      period_start: input.start_date,
      period_end: input.end_date
    };
  } catch (error) {
    console.error('Cash flow statement generation failed:', error);
    throw error;
  }
}
