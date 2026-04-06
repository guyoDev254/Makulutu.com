import Swal from 'sweetalert2'

export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'No Data',
      text: 'There is no data to export',
      confirmButtonColor: '#dc2626',
    })
    return
  }

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          if (value === null || value === undefined) return ''
          if (typeof value === 'object') return JSON.stringify(value)
          return String(value).replace(/,/g, ';')
        })
        .join(','),
    ),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  window.URL.revokeObjectURL(url)
}
