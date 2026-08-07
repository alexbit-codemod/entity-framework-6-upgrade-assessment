using System.Data.Entity;

namespace Sample
{
    public class Repo
    {
        public void Run(DbContext context)
        {
            context.Database.SqlQuery<int>("SELECT 1");
            Other.ExecuteSqlCommand("nope");
        }
    }

    public static class Other
    {
        public static void ExecuteSqlCommand(string sql) { }
    }
}
