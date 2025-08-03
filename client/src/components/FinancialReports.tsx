
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { BalanceSheet, IncomeStatement, CashFlowStatement } from '../../../server/src/schema';

export function FinancialReports() {
  const [isLoading, setIsLoading] = useState(false);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null);
  const [cashFlowStatement, setCashFlowStatement] = useState<CashFlowStatement | null>(null);
  
  // Form data for report parameters
  const [balanceSheetDate, setBalanceSheetDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportStartDate, setReportStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);

  const generateBalanceSheet = async () => {
    setIsLoading(true);
    try {
      const result = await trpc.generateBalanceSheet.query({
        as_of_date: new Date(balanceSheetDate)
      });
      setBalanceSheet(result);
    } catch (error) {
      console.error('Failed to generate balance sheet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateIncomeStatement = async () => {
    setIsLoading(true);
    try {
      const result = await trpc.generateIncomeStatement.query({
        start_date: new Date(reportStartDate),
        end_date: new Date(reportEndDate)
      });
      setIncomeStatement(result);
    } catch (error) {
      console.error('Failed to generate income statement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateCashFlowStatement = async () => {
    setIsLoading(true);
    try {
      const result = await trpc.generateCashFlowStatement.query({
        start_date: new Date(reportStartDate),
        end_date: new Date(reportEndDate)
      });
      setCashFlowStatement(result);
    } catch (error) {
      console.error('Failed to generate cash flow statement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">📈 Financial Reports</h2>
        <p className="text-gray-600">Generate and view comprehensive financial statements</p>
      </div>

      <Alert>
        <AlertDescription>
          💡 <strong>Note:</strong> All handlers currently return placeholder data. The reports below demonstrate the UI structure.
          In a real implementation, these would fetch actual financial data from your database.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="balance-sheet" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="balance-sheet">📊 Balance Sheet</TabsTrigger>
          <TabsTrigger value="income-statement">💰 Income Statement</TabsTrigger>
          <TabsTrigger value="cash-flow">💸 Cash Flow Statement</TabsTrigger>
        </TabsList>

        {/* Balance Sheet */}
        <TabsContent value="balance-sheet" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>📊 Balance Sheet</CardTitle>
              <CardDescription>
                Financial position as of a specific date showing assets, liabilities, and equity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-4">
                <div>
                  <Label htmlFor="balance_date">As of Date</Label>
                  <Input
                    id="balance_date"
                    type="date"
                    value={balanceSheetDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setBalanceSheetDate(e.target.value)
                    }
                    className="w-48"
                  />
                </div>
                <Button onClick={generateBalanceSheet} disabled={isLoading}>
                  {isLoading ? 'Generating...' : 'Generate Report'}
                </Button>
              </div>

              {balanceSheet && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-xl font-bold">Balance Sheet</h3>
                    <p className="text-gray-600">
                      As of {new Date(balanceSheet.as_of_date).toLocaleDateString('id-ID')}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Assets */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">🏦 Assets</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableBody>
                            {balanceSheet.assets.map((asset, index) => (
                              <TableRow key={index}>
                                <TableCell>{asset.account_name}</TableCell>
                                <TableCell className="text-right">
                                  Rp {asset.balance.toLocaleString('id-ID')}
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="border-t-2">
                              <TableCell className="font-bold">Total Assets</TableCell>
                              <TableCell className="text-right font-bold">
                                Rp {balanceSheet.total_assets.toLocaleString('id-ID')}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    {/* Liabilities and Equity */}
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">💳 Liabilities</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableBody>
                              {balanceSheet.liabilities.map((liability, index) => (
                                <TableRow key={index}>
                                  <TableCell>{liability.account_name}</TableCell>
                                  <TableCell className="text-right">
                                    Rp {liability.balance.toLocaleString('id-ID')}
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="border-t">
                                <TableCell className="font-semibold">Total Liabilities</TableCell>
                                <TableCell className="text-right font-semibold">
                                  Rp {balanceSheet.total_liabilities.toLocaleString('id-ID')}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">🏛️ Equity</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableBody>
                              {balanceSheet.equity.map((equity, index) => (
                                <TableRow key={index}>
                                  <TableCell>{equity.account_name}</TableCell>
                                  <TableCell className="text-right">
                                    Rp {equity.balance.toLocaleString('id-ID')}
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="border-t">
                                <TableCell className="font-semibold">Total Equity</TableCell>
                                <TableCell className="text-right font-semibold">
                                  Rp {balanceSheet.total_equity.toLocaleString('id-ID')}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>

                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-bold">Total Liabilities + Equity</span>
                          <span className="font-bold">
                            Rp {(balanceSheet.total_liabilities + balanceSheet.total_equity).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {balanceSheet.total_assets === (balanceSheet.total_liabilities + balanceSheet.total_equity)
                            ? '✅ Balance sheet is balanced'
                            : '⚠️ Balance sheet is not balanced'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Income Statement */}
        <TabsContent value="income-statement" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>💰 Income Statement (Profit & Loss)</CardTitle>
              <CardDescription>
                Revenue and expenses for a specific period showing net income
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-4">
                <div>
                  <Label htmlFor="start_date">From Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={reportStartDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setReportStartDate(e.target.value)
                    }
                    className="w-48"
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">To Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={reportEndDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setReportEndDate(e.target.value)
                    }
                    className="w-48"
                  />
                </div>
                <Button onClick={generateIncomeStatement} disabled={isLoading}>
                  {isLoading ? 'Generating...' : 'Generate Report'}
                </Button>
              </div>

              {incomeStatement && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-xl font-bold">Income Statement</h3>
                    <p className="text-gray-600">
                      Period: {new Date(incomeStatement.period_start).toLocaleDateString('id-ID')} - {' '}
                      {new Date(incomeStatement.period_end).toLocaleDateString('id-ID')}
                    </p>
                  </div>

                  <div className="max-w-2xl mx-auto space-y-6">
                    {/* Revenue */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg text-green-600">💰 Revenue</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableBody>
                            {incomeStatement.revenues.map((revenue, index) => (
                              <TableRow key={index}>
                                <TableCell>{revenue.account_name}</TableCell>
                                <TableCell className="text-right">
                                  Rp {revenue.amount.toLocaleString('id-ID')}
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="border-t-2">
                              <TableCell className="font-bold">Total Revenue</TableCell>
                              <TableCell className="text-right font-bold text-green-600">
                                Rp {incomeStatement.total_revenue.toLocaleString('id-ID')}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    {/* Expenses */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg text-red-600">💸 Expenses</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableBody>
                            {incomeStatement.expenses.map((expense, index) => (
                              <TableRow key={index}>
                                <TableCell>{expense.account_name}</TableCell>
                                <TableCell className="text-right">
                                  Rp {expense.amount.toLocaleString('id-ID')}
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="border-t-2">
                              <TableCell className="font-bold">Total Expenses</TableCell>
                              <TableCell className="text-right font-bold text-red-600">
                                Rp {incomeStatement.total_expenses.toLocaleString('id-ID')}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    {/* Net Income */}
                    <div className={`p-6 rounded-lg text-center ${
                      incomeStatement.net_income >= 0 ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      <h3 className="text-xl font-bold mb-2">Net Income</h3>
                      <p className={`text-3xl font-bold ${
                        incomeStatement.net_income >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        Rp {incomeStatement.net_income.toLocaleString('id-ID')}
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        {incomeStatement.net_income >= 0 ? 'Profit' : 'Loss'} for the period
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash Flow Statement */}
        <TabsContent value="cash-flow" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>💸 Cash Flow Statement</CardTitle>
              <CardDescription>
                Cash inflows and outflows from operating, investing, and financing activities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-4">
                <div>
                  <Label htmlFor="cf_start_date">From Date</Label>
                  <Input
                    id="cf_start_date"
                    type="date"
                    value={reportStartDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setReportStartDate(e.target.value)
                    }
                    className="w-48"
                  />
                </div>
                <div>
                  <Label htmlFor="cf_end_date">To Date</Label>
                  <Input
                    id="cf_end_date"
                    type="date"
                    value={reportEndDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setReportEndDate(e.target.value)
                    }
                    className="w-48"
                  />
                </div>
                <Button onClick={generateCashFlowStatement} disabled={isLoading}>
                  {isLoading ? 'Generating...' : 'Generate Report'}
                </Button>
              </div>

              {cashFlowStatement && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-xl font-bold">Cash Flow Statement</h3>
                    <p className="text-gray-600">
                      Period: {new Date(cashFlowStatement.period_start).toLocaleDateString('id-ID')} - {' '}
                      {new Date(cashFlowStatement.period_end).toLocaleDateString('id-ID')}
                    </p>
                  </div>

                  <div className="max-w-2xl mx-auto space-y-6">
                    {/* Operating Activities */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">🔄 Operating Activities</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableBody>
                            {cashFlowStatement.operating_activities.map((activity, index) => (
                              <TableRow key={index}>
                                <TableCell>{activity.description}</TableCell>
                                <TableCell className="text-right">
                                  Rp {activity.amount.toLocaleString('id-ID')}
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="border-t-2">
                              <TableCell className="font-bold">Net Cash from Operating</TableCell>
                              <TableCell className={`text-right font-bold ${
                                cashFlowStatement.net_operating_cash >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                Rp {cashFlowStatement.net_operating_cash.toLocaleString('id-ID')}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    {/* Investing Activities */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">📈 Investing Activities</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableBody>
                            {cashFlowStatement.investing_activities.length > 0 ? (
                              cashFlowStatement.investing_activities.map((activity, index) => (
                                <TableRow key={index}>
                                  <TableCell>{activity.description}</TableCell>
                                  <TableCell className="text-right">
                                    Rp {activity.amount.toLocaleString('id-ID')}
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center text-gray-500">
                                  No investing activities in this period
                                </TableCell>
                              </TableRow>
                            )}
                            <TableRow className="border-t-2">
                              <TableCell className="font-bold">Net Cash from Investing</TableCell>
                              <TableCell className={`text-right font-bold ${
                                cashFlowStatement.net_investing_cash >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                Rp {cashFlowStatement.net_investing_cash.toLocaleString('id-ID')}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    {/* Financing Activities */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">🏦 Financing Activities</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableBody>
                            {cashFlowStatement.financing_activities.length > 0 ? (
                              cashFlowStatement.financing_activities.map((activity, index) => (
                                <TableRow key={index}>
                                  <TableCell>{activity.description}</TableCell>
                                  <TableCell className="text-right">
                                    Rp {activity.amount.toLocaleString('id-ID')}
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center text-gray-500">
                                  No financing activities in this period
                                </TableCell>
                              </TableRow>
                            )}
                            <TableRow className="border-t-2">
                              <TableCell className="font-bold">Net Cash from Financing</TableCell>
                              <TableCell className={`text-right font-bold ${
                                cashFlowStatement.net_financing_cash >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                Rp {cashFlowStatement.net_financing_cash.toLocaleString('id-ID')}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    {/* Net Cash Flow */}
                    <div className={`p-6 rounded-lg text-center ${
                      cashFlowStatement.net_cash_flow >= 0 ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      <h3 className="text-xl font-bold mb-2">Net Cash Flow</h3>
                      <p className={`text-3xl font-bold ${
                        cashFlowStatement.net_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        Rp {cashFlowStatement.net_cash_flow.toLocaleString('id-ID')}
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        {cashFlowStatement.net_cash_flow >= 0 ? 'Cash increased' : 'Cash decreased'} during the period
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
