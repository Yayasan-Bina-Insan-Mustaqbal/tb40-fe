import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getAnalytics } from '@/lib/api-client'
import { ExternalLinkIcon } from 'lucide-react'

type User = {
  id: number
  session_id: string
  name: string | null
  age: number | null
  test_mode: string | null
  started_at: string
  completed_at: string | null
  is_complete: number
  answers_count: number
  has_result: number | null
}

type Stats = {
  total_users: number
  completed_users: number
  partial_users: number
  avg_completion_minutes: number | null
}

type AnalyticsData = {
  success: boolean
  users: User[]
  stats: Stats
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAnalytics()
      .then((result) => {
        if (result.success) {
          setData(result as AnalyticsData)
        } else {
          setError('Failed to load analytics')
        }
      })
      .catch(() => setError('Failed to fetch analytics'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error || 'No data available'}</p>
        </CardContent>
      </Card>
    )
  }

  const completionRate = data.stats.total_users > 0
    ? Math.round((data.stats.completed_users / data.stats.total_users) * 100)
    : 0

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.stats.total_users}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.stats.completed_users}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>In Progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.stats.partial_users}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completion Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completionRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Avg Completion Time */}
      {data.stats.avg_completion_minutes && (
        <Card>
          <CardHeader>
            <CardTitle>Average Completion Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {Math.round(data.stats.avg_completion_minutes)} minutes
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            Showing all test sessions including partial submissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Answers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No users yet
                  </TableCell>
                </TableRow>
              ) : (
                data.users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name || 'Anonymous'}</TableCell>
                    <TableCell>{user.age || '-'}</TableCell>
                    <TableCell className="capitalize">{user.test_mode || '-'}</TableCell>
                    <TableCell>{user.answers_count}</TableCell>
                    <TableCell>
                      {user.is_complete ? (
                        <Badge variant="default">Complete</Badge>
                      ) : (
                        <Badge variant="secondary">In Progress</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(user.started_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {user.completed_at
                        ? new Date(user.completed_at).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.is_complete && user.session_id ? (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a
                            href={`/result?session=${user.session_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1"
                          >
                            View Result
                            <ExternalLinkIcon className="h-3 w-3" />
                          </a>
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
