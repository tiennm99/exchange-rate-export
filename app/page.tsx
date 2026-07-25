"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Loader2 } from "lucide-react"
import writeXlsxFile, { type Column } from "write-excel-file/browser"

interface ExchangeRateData {
  date: string
  bank: string
  currency: string
  askRate: string
  bidRateCK: string
  bidRateTM: string
  askRateTM: string
  inputDate: string
}

// Mirrors the column order of the CSV export. Every rate arrives from the API
// as a string and is written as-is, so no cell is coerced to a number.
const XLSX_COLUMNS: Column<ExchangeRateData>[] = [
  { header: "Date", cell: (row) => row.date },
  { header: "Bank", cell: (row) => row.bank },
  { header: "Currency", cell: (row) => row.currency },
  { header: "Ask Rate", cell: (row) => row.askRate },
  { header: "Bid Rate CK", cell: (row) => row.bidRateCK },
  { header: "Bid Rate TM", cell: (row) => row.bidRateTM },
  { header: "Ask Rate TM", cell: (row) => row.askRateTM },
  { header: "Input Date", cell: (row) => row.inputDate },
]

type BankType = "techcombank" | "bidv"

// Currency options for each bank
const BANK_CURRENCIES = {
  techcombank: [
    { value: "USD (50,100)", label: "USD (50,100)" },
    { value: "USD (1,2)", label: "USD (1,2)" },
    { value: "USD (5,10,20)", label: "USD (5,10,20)" },
    { value: "EUR", label: "EUR" },
    { value: "GBP", label: "GBP" },
    { value: "JPY", label: "JPY" },
    { value: "AUD", label: "AUD" },
    { value: "CAD", label: "CAD" },
    { value: "CHF", label: "CHF" },
    { value: "CNY", label: "CNY" },
    { value: "HKD", label: "HKD" },
    { value: "SGD", label: "SGD" },
    { value: "THB", label: "THB" },
    { value: "KRW", label: "KRW" },
    { value: "NZD", label: "NZD" },
  ],
  bidv: [
    { value: "USD", label: "USD" },
    { value: "USD(1-2-5)", label: "USD (1-2-5)" },
    { value: "USD(10-20)", label: "USD (10-20)" },
    { value: "EUR", label: "EUR" },
    { value: "GBP", label: "GBP" },
    { value: "JPY", label: "JPY" },
    { value: "AUD", label: "AUD" },
    { value: "CAD", label: "CAD" },
    { value: "CHF", label: "CHF" },
    { value: "CNY", label: "CNY" },
    { value: "HKD", label: "HKD" },
    { value: "SGD", label: "SGD" },
    { value: "THB", label: "THB" },
    { value: "KRW", label: "KRW" },
    { value: "NZD", label: "NZD" },
    { value: "SEK", label: "SEK" },
    { value: "DKK", label: "DKK" },
    { value: "NOK", label: "NOK" },
    { value: "RUB", label: "RUB" },
    { value: "TWD", label: "TWD" },
    { value: "MYR", label: "MYR" },
    { value: "SAR", label: "SAR" },
    { value: "KWD", label: "KWD" },
    { value: "LAK", label: "LAK" },
    { value: "XAU", label: "Gold (XAU)" },
  ],
}

// Helper function to get default dates
const getDefaultDates = () => {
  const today = new Date()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  return {
    endDate: today.toISOString().split("T")[0],
    startDate: sevenDaysAgo.toISOString().split("T")[0],
  }
}

export default function ExchangeRateExporter() {
  const [bank, setBank] = useState<BankType>("techcombank")
  const [currency, setCurrency] = useState("USD (50,100)")
  const defaultDates = getDefaultDates()
  const [startDate, setStartDate] = useState(defaultDates.startDate)
  const [endDate, setEndDate] = useState(defaultDates.endDate)
  const [data, setData] = useState<ExchangeRateData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Update currency when bank changes
  const handleBankChange = (newBank: BankType) => {
    setBank(newBank)
    // Set default currency for the selected bank
    const defaultCurrency = newBank === "techcombank" ? "USD (50,100)" : "USD"
    setCurrency(defaultCurrency)
  }

  const generateDateRange = (start: string, end: string): string[] => {
    const dates = []
    const startDate = new Date(start)
    const endDate = new Date(end)

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d).toISOString().split("T")[0])
    }

    return dates
  }

  const fetchTechcombankRate = async (date: string): Promise<ExchangeRateData | null> => {
    try {
      const res = await fetch(`/api/exchange/techcombank?date=${date}`)
      if (!res.ok) {
        if (res.status === 404) {
          return null
        }
        console.error(`Techcombank API returned ${res.status} for ${date}`)
        return null
      }

      const result = await res.json()
      const currencyData = result.exchangeRate?.data?.find((item: any) => item.label === currency)
      if (!currencyData) return null

      return {
        date,
        bank: "Techcombank",
        currency,
        askRate: currencyData.askRate || "N/A",
        bidRateCK: currencyData.bidRateCK || "N/A",
        bidRateTM: currencyData.bidRateTM || "N/A",
        askRateTM: currencyData.askRateTM || "N/A",
        inputDate: currencyData.inputDate || "N/A",
      }
    } catch (err) {
      console.error(`Techcombank fetch failed for ${date}`, err)
      return null
    }
  }

  const fetchBIDVRate = async (date: string): Promise<ExchangeRateData | null> => {
    try {
      const res = await fetch(`/api/exchange/bidv?date=${date}`)
      if (!res.ok) {
        if (res.status === 404) {
          return null
        }
        console.error(`BIDV API returned ${res.status} for ${date}`)
        return null
      }

      const result = await res.json()
      const currencyData = result.data?.find((item: any) => item.currency === currency)
      if (!currencyData) return null

      return {
        date,
        bank: "BIDV",
        currency,
        askRate: currencyData.ban || "N/A",
        bidRateCK: currencyData.muaCk || "N/A",
        bidRateTM: currencyData.muaTm || "N/A",
        askRateTM: currencyData.ban || "N/A",
        inputDate: `${result.day_vi} ${result.hour}` || "N/A",
      }
    } catch (err) {
      console.error(`BIDV fetch failed for ${date}`, err)
      return null
    }
  }

  const fetchExchangeRate = async (date: string): Promise<ExchangeRateData | null> => {
    if (bank === "techcombank") {
      return fetchTechcombankRate(date)
    } else {
      return fetchBIDVRate(date)
    }
  }

  const handleFetchData = async () => {
    if (!startDate || !endDate) {
      setError("Please select both start and end dates")
      return
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError("Start date must be before end date")
      return
    }

    setLoading(true)
    setError("")
    setData([])

    try {
      const dates = generateDateRange(startDate, endDate)
      const results: ExchangeRateData[] = []

      for (const date of dates) {
        const rateData = await fetchExchangeRate(date)
        if (rateData) {
          results.push(rateData)
        }
        // Add a small delay to avoid overwhelming the API
        await new Promise((resolve) => setTimeout(resolve, 200))
      }

      setData(results)
      if (results.length === 0) {
        setError("No data found for the selected date range")
      }
    } catch (error) {
      setError("An error occurred while fetching data")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (data.length === 0) return

    const headers = ["Date", "Bank", "Currency", "Ask Rate", "Bid Rate CK", "Bid Rate TM", "Ask Rate TM", "Input Date"]
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        [
          row.date,
          row.bank,
          row.currency,
          row.askRate,
          row.bidRateCK,
          row.bidRateTM,
          row.askRateTM,
          row.inputDate,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute(
      "download",
      `exchange_rates_${bank}_${currency.replace(/[^a-zA-Z0-9]/g, "_")}_${startDate}_to_${endDate}.csv`,
    )
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToXLSX = async () => {
    if (data.length === 0) return

    // toFile triggers the browser download, so no manual object URL is needed.
    try {
      await writeXlsxFile(data, {
        columns: XLSX_COLUMNS,
        sheet: "Exchange Rates",
      }).toFile(
        `exchange_rates_${bank}_${currency.replace(/[^a-zA-Z0-9]/g, "_")}_${startDate}_to_${endDate}.xlsx`,
      )
    } catch (error) {
      setError("An error occurred while exporting to XLSX")
      console.error(error)
    }
  }

  const formatNumber = (value: string) => {
    if (value === "N/A" || !value || value === "-") return value
    // Remove commas and parse
    const numValue = Number.parseFloat(value.replace(/,/g, ""))
    if (isNaN(numValue)) return value
    return numValue.toLocaleString()
  }

  const currentCurrencies = BANK_CURRENCIES[bank]

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Vietnam Bank Exchange Rate Exporter</CardTitle>
          <CardDescription>
            Fetch exchange rates from Vietnamese banks for a date range and export to CSV or XLSX
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <Label htmlFor="bank">Bank</Label>
              <Select value={bank} onValueChange={handleBankChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bank" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="techcombank">Techcombank</SelectItem>
                  <SelectItem value="bidv">BIDV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currentCurrencies.map((curr) => (
                    <SelectItem key={curr.value} value={curr.value}>
                      {curr.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <Button onClick={handleFetchData} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                "Fetch Data"
              )}
            </Button>
          </div>
          {error && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">{error}</div>}
        </CardContent>
      </Card>

      {data.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Exchange Rate Data</CardTitle>
                <CardDescription>
                  {currency} rates from {bank.toUpperCase()} from {startDate} to {endDate} ({data.length} records)
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={exportToCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
                <Button variant="outline" onClick={exportToXLSX}>
                  <Download className="mr-2 h-4 w-4" />
                  Export XLSX
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead className="text-right">Ask Rate</TableHead>
                    <TableHead className="text-right">Bid Rate CK</TableHead>
                    <TableHead className="text-right">Bid Rate TM</TableHead>
                    <TableHead className="text-right">Ask Rate TM</TableHead>
                    <TableHead>Input Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.date}</TableCell>
                      <TableCell>{row.bank}</TableCell>
                      <TableCell>{row.currency}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.askRate)}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.bidRateCK)}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.bidRateTM)}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.askRateTM)}</TableCell>
                      <TableCell>{row.inputDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
