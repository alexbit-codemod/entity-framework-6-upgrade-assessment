using System.Data.Entity;

namespace Sample
{
    public class Repo
    {
        public void Run()
        {
            Database.ExecuteSqlCommand("UPDATE Customers SET Active = 1");
            Database.ExecuteSqlCommand("DELETE FROM Sessions");
        }
    }
}
